import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import twilio from 'npm:twilio@^4'; // Cambiado a rango de versión
import OpenAI from 'npm:openai@^4'; // Cambiado a rango de versión

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const twilioClient = twilio(Deno.env.get('TWILIO_ACCOUNT_SID'), Deno.env.get('TWILIO_AUTH_TOKEN'));
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioPhoneNumber) {
      throw new Error('TWILIO_PHONE_NUMBER environment variable is not set.');
    }

    const formData = await req.formData();
    const from = formData.get('From')?.toString();
    const body = formData.get('Body')?.toString();

    if (!from || !body) {
      return new Response(JSON.stringify({ error: 'Missing From or Body in Twilio request' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`Received message from ${from}: ${body}`);

    // Fetch clinic settings to get user_id and timezone
    const { data: clinicSettings, error: settingsError } = await supabaseClient
      .from('clinic_settings')
      .select('id, timezone, services, working_hours, clinic_name, clinic_address, clinic_phone, clinic_email')
      .limit(1)
      .single();

    if (settingsError || !clinicSettings) {
      console.error('Error fetching clinic settings for user_id:', settingsError);
      return new Response('<Response><Message>Lo siento, no pude procesar tu solicitud en este momento. Por favor, asegúrate de que la configuración de la clínica esté completa.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 500,
      });
    }
    const userId = clinicSettings.id;
    const clinicTimezone = clinicSettings.timezone || 'America/Mexico_City';

    // Persist the incoming message
    const { error: messageInsertError } = await supabaseClient
      .from('messages')
      .insert({
        user_id: userId,
        phone_number: from,
        message_content: body,
        sender: 'user',
        received_at: new Date().toISOString(),
      });

    if (messageInsertError) {
      console.error('Error inserting incoming message:', messageInsertError);
    }

    // Fetch conversation history for context (last 10 messages)
    const { data: messageHistory, error: historyError } = await supabaseClient
      .from('messages')
      .select('message_content, sender')
      .eq('user_id', userId)
      .eq('phone_number', from)
      .order('received_at', { ascending: true })
      .limit(10);

    if (historyError) {
      console.error('Error fetching message history:', historyError);
    }

    const messages = (messageHistory || []).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message_content,
    }));

    // Add the current message to the history for OpenAI
    messages.push({ role: 'user', content: body });

    // Fetch or create conversation state
    let { data: conversationState, error: fetchStateError } = await supabaseClient
      .from('conversation_state')
      .select('*')
      .eq('phone_number', from)
      .eq('user_id', userId)
      .single();

    if (fetchStateError && fetchStateError.code === 'PGRST116') {
      const { data: newConversationState, error: insertStateError } = await supabaseClient
        .from('conversation_state')
        .insert({
          user_id: userId,
          phone_number: from,
          current_step: 'initial',
          temp_data: {},
        })
        .select('*')
        .single();
      if (insertStateError) {
        console.error('Error creating conversation state:', insertStateError);
        return new Response('<Response><Message>Lo siento, no pude iniciar la conversación. Por favor, inténtalo más tarde.</Message></Response>', {
          headers: { 'Content-Type': 'text/xml' },
          status: 500,
        });
      }
      conversationState = newConversationState;
    } else if (fetchStateError) {
      console.error('Error fetching conversation state:', fetchStateError);
      return new Response('<Response><Message>Lo siento, no pude recuperar el estado de la conversación. Por favor, inténtalo más tarde.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 500,
      });
    }

    // --- OpenAI Function Calling Tools ---
    const tools = [
      {
        type: 'function',
        function: {
          name: 'check_availability',
          description: 'Verifica la disponibilidad de un médico para una fecha y hora específicas.',
          parameters: {
            type: 'object',
            properties: {
              doctor_id: { type: 'string', description: 'ID del médico.' },
              date: { type: 'string', format: 'date', description: 'Fecha de la cita en formato YYYY-MM-DD.' },
              time: { type: 'string', format: 'time', description: 'Hora de la cita en formato HH:MM.' },
              specialty: { type: 'string', description: 'Especialidad del médico.' },
            },
            required: ['date', 'time'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_appointment',
          description: 'Crea una nueva cita médica para un paciente.',
          parameters: {
            type: 'object',
            properties: {
              patient_name: { type: 'string', description: 'Nombre completo del paciente.' },
              phone_number: { type: 'string', description: 'Número de teléfono del paciente.' },
              appointment_date: { type: 'string', format: 'date-time', description: 'Fecha y hora de la cita en formato ISO 8601.' },
              appointment_type: { type: 'string', description: 'Tipo de cita (ej. consulta general, revisión, etc.).' },
              doctor_id: { type: 'string', description: 'ID del médico asignado a la cita.' },
              notes: { type: 'string', description: 'Notas adicionales para la cita.' },
            },
            required: ['patient_name', 'phone_number', 'appointment_date', 'appointment_type'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cancel_appointment',
          description: 'Cancela una cita médica existente.',
          parameters: {
            type: 'object',
            properties: {
              appointment_id: { type: 'string', description: 'ID de la cita a cancelar.' },
            },
            required: ['appointment_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'reschedule_appointment',
          description: 'Reprograma una cita médica existente a una nueva fecha y hora.',
          parameters: {
            type: 'object',
            properties: {
              appointment_id: { type: 'string', description: 'ID de la cita a reprogramar.' },
              new_appointment_date: { type: 'string', format: 'date-time', description: 'Nueva fecha y hora de la cita en formato ISO 8601.' },
            },
            required: ['appointment_id', 'new_appointment_date'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'change_doctor',
          description: 'Cambia el médico asignado a una cita existente.',
          parameters: {
            type: 'object',
            properties: {
              appointment_id: { type: 'string', description: 'ID de la cita a modificar.' },
              new_doctor_id: { type: 'string', description: 'Nuevo ID del médico.' },
            },
            required: ['appointment_id', 'new_doctor_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_clinic_info',
          description: 'Obtiene información general de la clínica como nombre, dirección, teléfono, email, horarios de atención y servicios.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      },
    ];

    // --- Helper Functions for Tools ---
    const getDoctors = async (specialty?: string) => {
      let query = supabaseClient.from('doctors').select('id, full_name, specialty, status').eq('user_id', userId).eq('status', true);
      if (specialty) {
        query = query.ilike('specialty', `%${specialty}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    };

    const getPatient = async (phoneNumber: string) => {
      const { data, error } = await supabaseClient
        .from('patients')
        .select('id, first_name, last_name')
        .eq('user_id', userId)
        .eq('phone', phoneNumber)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    };

    const createPatient = async (phoneNumber: string, firstName: string, lastName: string) => {
      const { data, error } = await supabaseClient
        .from('patients')
        .insert({ user_id: userId, phone: phoneNumber, first_name: firstName, last_name: lastName })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    };

    const getAppointments = async (phoneNumber: string, status?: string) => {
      let query = supabaseClient
        .from('appointments')
        .select('id, patient_name, appointment_date, appointment_type, status, doctors(full_name)')
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber);
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query.order('appointment_date', { ascending: false });
      if (error) throw error;
      return data;
    };

    const getAvailabilityRules = async (doctorId: string, dayOfWeek: number) => {
      const { data, error } = await supabaseClient
        .from('availability_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek);
      if (error) throw error;
      return data;
    };

    const getAppointmentsForSlot = async (doctorId: string, date: string, startTime: string, endTime: string) => {
      const { data, error } = await supabaseClient
        .from('appointments')
        .select('id')
        .eq('user_id', userId)
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date) // Assuming date includes time for exact slot
        .gte('appointment_date', `${date}T${startTime}:00.000Z`)
        .lt('appointment_date', `${date}T${endTime}:00.000Z`)
        .in('status', ['pending', 'confirmed']);
      if (error) throw error;
      return data;
    };

    const callTool = async (toolCall: any) => {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      switch (functionName) {
        case 'check_availability': {
          const { date, time, specialty } = args;
          const targetDate = new Date(`${date}T${time}:00`);
          const dayOfWeek = targetDate.getDay(); // 0 for Sunday, 1 for Monday, etc.

          let doctors = await getDoctors(specialty);
          if (!doctors || doctors.length === 0) {
            return `No se encontraron médicos disponibles para la especialidad de ${specialty}.`;
          }

          let availableSlots: string[] = [];
          for (const doctor of doctors) {
            const rules = await getAvailabilityRules(doctor.id, dayOfWeek);
            for (const rule of rules) {
              const ruleStartTime = new Date(`${date}T${rule.start_time}`);
              const ruleEndTime = new Date(`${date}T${rule.end_time}`);
              const requestedTime = new Date(`${date}T${time}`);

              if (requestedTime >= ruleStartTime && requestedTime < ruleEndTime) {
                const existingAppointments = await getAppointmentsForSlot(
                  doctor.id,
                  date,
                  rule.start_time, // Use rule's start/end for slot check
                  rule.end_time
                );
                if (existingAppointments.length < rule.max_appointments_per_slot) {
                  availableSlots.push(`${doctor.full_name} (${doctor.specialty}) a las ${time}`);
                }
              }
            }
          }
          return availableSlots.length > 0
            ? `Hay disponibilidad con: ${availableSlots.join(', ')}.`
            : `No hay disponibilidad para ${specialty ? `la especialidad de ${specialty}` : ''} el ${date} a las ${time}.`;
        }
        case 'create_appointment': {
          let { patient_name, phone_number, appointment_date, appointment_type, doctor_id, notes } = args;

          // Check if patient exists, if not, create a placeholder patient
          let patient = await getPatient(phone_number);
          if (!patient) {
            // Try to extract first_name and last_name from patient_name
            const nameParts = patient_name.split(' ');
            const firstName = nameParts[0] || 'Paciente';
            const lastName = nameParts.slice(1).join(' ') || 'Anónimo';
            patient = await createPatient(phone_number, firstName, lastName);
          }

          // Validate doctor_id
          let selectedDoctor = null;
          if (doctor_id) {
            const doctors = await getDoctors();
            selectedDoctor = doctors?.find(d => d.id === doctor_id || d.full_name.toLowerCase().includes(doctor_id.toLowerCase()));
            if (!selectedDoctor) {
              return `No se encontró el médico con ID o nombre "${doctor_id}". Por favor, proporciona un ID o nombre de médico válido.`;
            }
            doctor_id = selectedDoctor.id; // Ensure we use the actual doctor ID
          } else {
            // If no doctor_id, try to find a general doctor or assign null
            const doctors = await getDoctors();
            selectedDoctor = doctors?.[0] || null; // Assign first available doctor or null
            doctor_id = selectedDoctor?.id || null;
          }

          const { data, error } = await supabaseClient
            .from('appointments')
            .insert({
              user_id: userId,
              phone_number,
              patient_name,
              appointment_date,
              appointment_type,
              doctor_id,
              notes,
              status: 'pending', // Always pending initially
            })
            .select('id')
            .single();

          if (error) throw error;
          return `Cita creada con éxito. ID de cita: ${data.id}. Estado: Pendiente de confirmación.`;
        }
        case 'cancel_appointment': {
          const { appointment_id } = args;
          const { data, error } = await supabaseClient
            .from('appointments')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', appointment_id)
            .eq('user_id', userId)
            .select('id')
            .single();
          if (error) throw error;
          if (!data) return `No se encontró la cita con ID ${appointment_id} o no tienes permiso para cancelarla.`;
          return `Cita ${appointment_id} cancelada con éxito.`;
        }
        case 'reschedule_appointment': {
          const { appointment_id, new_appointment_date } = args;
          const { data, error } = await supabaseClient
            .from('appointments')
            .update({ appointment_date: new_appointment_date, status: 'rescheduled', updated_at: new Date().toISOString() })
            .eq('id', appointment_id)
            .eq('user_id', userId)
            .select('id')
            .single();
          if (error) throw error;
          if (!data) return `No se encontró la cita con ID ${appointment_id} o no tienes permiso para reprogramarla.`;
          return `Cita ${appointment_id} reprogramada con éxito para ${new Date(new_appointment_date).toLocaleString()}.`;
        }
        case 'change_doctor': {
          const { appointment_id, new_doctor_id } = args;
          const doctors = await getDoctors();
          const selectedDoctor = doctors?.find(d => d.id === new_doctor_id || d.full_name.toLowerCase().includes(new_doctor_id.toLowerCase()));
          if (!selectedDoctor) {
            return `No se encontró el nuevo médico con ID o nombre "${new_doctor_id}".`;
          }

          const { data, error } = await supabaseClient
            .from('appointments')
            .update({ doctor_id: selectedDoctor.id, updated_at: new Date().toISOString() })
            .eq('id', appointment_id)
            .eq('user_id', userId)
            .select('id')
            .single();
          if (error) throw error;
          if (!data) return `No se encontró la cita con ID ${appointment_id} o no tienes permiso para modificarla.`;
          return `Médico de la cita ${appointment_id} cambiado a ${selectedDoctor.full_name} con éxito.`;
        }
        case 'get_clinic_info': {
          const { clinic_name, clinic_address, clinic_phone, clinic_email, working_hours, services, about_clinic } = clinicSettings;
          let info = `Nombre de la clínica: ${clinic_name}.`;
          if (about_clinic) info += ` Descripción: ${about_clinic}.`;
          if (clinic_address) info += ` Dirección: ${clinic_address}.`;
          if (clinic_phone) info += ` Teléfono: ${clinic_phone}.`;
          if (clinic_email) info += ` Email: ${clinic_email}.`;
          if (services && services.length > 0) info += ` Servicios: ${services.join(', ')}.`;
          if (working_hours) {
            info += ` Horarios de atención: Lunes a Viernes de ${working_hours.weekdays.startTime} a ${working_hours.weekdays.endTime} (${working_hours.weekdays.open ? 'Abierto' : 'Cerrado'}).`;
            info += ` Sábados de ${working_hours.saturday.startTime} a ${working_hours.saturday.endTime} (${working_hours.saturday.open ? 'Abierto' : 'Cerrado'}).`;
            info += ` Domingos: ${working_hours.sunday.open ? `${working_hours.sunday.startTime} a ${working_hours.sunday.endTime}` : 'Cerrado'}.`;
          }
          return info;
        }
        default:
          return `Función ${functionName} no reconocida.`;
      }
    };

    // --- OpenAI Chat Completion ---
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Usar el modelo gpt-4o-mini
      messages: messages as any, // Cast para evitar errores de tipo con 'role'
      tools: tools,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;
    let aiResponseContent = responseMessage.content || '';

    // Step 4: Handle tool calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCalls = responseMessage.tool_calls;
      for (const toolCall of toolCalls) {
        const toolOutput = await callTool(toolCall);
        messages.push(responseMessage as any); // Add assistant's tool call to messages
        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: toolOutput,
        } as any); // Add tool output to messages

        // Call OpenAI again with tool output
        const secondResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages as any,
        });
        aiResponseContent = secondResponse.choices[0].message.content || 'Lo siento, no pude generar una respuesta clara.';
      }
    }

    // Persist the AI's response
    const { error: aiMessageInsertError } = await supabaseClient
      .from('messages')
      .insert({
        user_id: userId,
        phone_number: from,
        message_content: aiResponseContent,
        sender: 'assistant',
        received_at: new Date().toISOString(),
      });

    if (aiMessageInsertError) {
      console.error('Error inserting AI response message:', aiMessageInsertError);
    }

    // Update conversation state (e.g., current_step based on AI's action)
    const { error: updateStateError } = await supabaseClient
      .from('conversation_state')
      .update({
        current_step: 'awaiting_user_response', // Or a more specific step based on AI's action
        temp_data: { last_ai_response: aiResponseContent },
        updated_at: new Date().toISOString(),
      })
      .eq('phone_number', from)
      .eq('user_id', userId);

    if (updateStateError) {
      console.error('Error updating conversation state:', updateStateError);
    }

    const twimlResponse = `<Response><Message>${aiResponseContent}</Message></Response>`;

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in Twilio webhook:', error);
    const errorMessage = error.message || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.';
    return new Response(`<Response><Message>Lo siento, hubo un problema: ${errorMessage}</Message></Response>`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
});