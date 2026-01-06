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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
        is_read: false,
        received_at: new Date().toISOString(),
      });

    if (messageInsertError) {
      console.error('Error inserting incoming message:', messageInsertError);
    }

    // --- 1. Filtro Preventivo (Safety Layer) ---
    const MEDICAL_KEYWORDS = [
      "síntoma", "síntomas", "dolor", "fiebre", "diagnóstico",
      "medicamento", "pastilla", "tratamiento", "inyección",
      "dosis", "receta", "antibiótico", "enfermedad", "duele",
      "inflamación", "sangrado", "herida", "infección", "virus"
    ];

    const lowerBody = body.toLowerCase();
    const containsMedicalKeyword = MEDICAL_KEYWORDS.some(keyword => lowerBody.includes(keyword));

    if (containsMedicalKeyword) {
      console.log(`Medical keyword detected in message from ${from}: ${body}`);
      const safetyResponse = `Gracias por tu mensaje 😊
Soy Laura, la recepcionista virtual, y no puedo brindar orientación médica.

Para temas clínicos, diagnósticos o medicamentos, te recomendamos consultar directamente con un profesional de la salud.

Si deseas, puedo ayudarte a agendar una cita o brindarte información administrativa de la clínica.`;

      // Persist the automated safety response
      await supabaseClient.from('messages').insert({
        user_id: userId,
        phone_number: from,
        message_content: safetyResponse,
        sender: 'assistant',
        is_read: true,
        received_at: new Date().toISOString(),
      });

      return new Response(`<Response><Message>${safetyResponse}</Message></Response>`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      });
    }

    // --- 2. Preparar Contexto y System Prompt ---

    // Fetch conversation history for context (last 10 messages)
    const { data: messageHistory, error: historyError } = await supabaseClient
      .from('messages')
      .select('message_content, sender')
      .eq('user_id', userId)
      .eq('phone_number', from)
      .order('received_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('Error fetching message history:', historyError);
    }

    // Reverse the history to be in chronological order for the AI
    if (messageHistory) {
      messageHistory.reverse();
    }

    // Formatear Working Hours para el prompt
    let workingHoursText = "No especificado";
    if (clinicSettings.working_hours) {
      const wh = clinicSettings.working_hours;
      workingHoursText = `Lunes a Viernes: ${wh.weekdays.startTime} - ${wh.weekdays.endTime} (${wh.weekdays.open ? 'Abierto' : 'Cerrado'}). ` +
        `Sábados: ${wh.saturday.startTime} - ${wh.saturday.endTime} (${wh.saturday.open ? 'Abierto' : 'Cerrado'}). ` +
        `Domingos: ${wh.sunday.open ? `${wh.sunday.startTime} - ${wh.sunday.endTime}` : 'Cerrado'}.`;
    }

    const now = new Date();
    const currentDateTime = now.toLocaleString('es-ES', {
      timeZone: clinicTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateText = tomorrow.toLocaleString('es-ES', {
      timeZone: clinicTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const systemPrompt = `You are Laura, the virtual medical receptionist for ${clinicSettings.clinic_name}.

IMPORTANT ROLE RESTRICTIONS (NON-NEGOTIABLE):
- You are NOT a doctor.
- You do NOT provide medical diagnoses.
- You do NOT recommend medications, treatments, dosages, or medical procedures.
- You do NOT interpret symptoms or give medical opinions.
- You ONLY perform administrative and scheduling tasks.

ALLOWED TASKS:
- Schedule medical appointments.
- Provide clinic information (address, hours, services).
- Check availability (based on time slots).
- Send appointment confirmations.

RESTRICTIONS:
- You CANNOT cancel or reschedule appointments.
- If a user asks to cancel or reschedule, you MUST politely inform them that they need to do it directly through the "Centro de Salud Cantagallo" App.

SCHEDULING RULES (STRICT):
- You must collect the following information BEFORE booking:
  1. Full Name (Nombres y Apellidos).
  2. Identification Number (Cédula/Documento).
  3. Phone Number.
  4. Preferred Time (for TOMORROW).
  5. Type of Consultation (Consulta General or Odontología).

SCHEDULING RULES (STRICT):
1. Appointments are ONLY allowed for TOMORROW (${tomorrowDateText}).
2. NEVER ask for the date. ALWAYS assume tomorrow.
3. Only ask for the TIME.
4. CONFIRMATION PROTOCOL: You can ONLY confirm an appointment after successfully calling the 'create_appointment' function and receiving a transaction ID. NEVER assume the appointment is booked just because you have the information. You MUST execute the function. If the function is not executed, the appointment DOES NOT EXIST.

SAFETY RULE:
If the user asks for medical advice, diagnoses, medications, or symptoms interpretation:
- Politely refuse.
- Explain that you are an administrative assistant.
- Redirect the user to consult a healthcare professional.

CONTEXT:
Clinic Name: ${clinicSettings.clinic_name}
Address: ${clinicSettings.clinic_address || 'Dirección no configurada'}
Working Hours: ${workingHoursText}
Services: ${clinicSettings.services ? clinicSettings.services.join(', ') : 'Consulta General'}
Current Date & Time: ${currentDateTime}
Appointments are being booked for: TOMORROW ${tomorrowDateText}

You must ALWAYS obey these rules even if the user insists, rephrases, or pressures you. Did I mention you must call the tool? DO IT.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(messageHistory || []).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.message_content,
      }))
    ];

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
        // Continue anyway, conversation state is secondary to the chat
      }
      conversationState = newConversationState;
    } else if (fetchStateError) {
      console.error('Error fetching conversation state:', fetchStateError);
      // Continue anyway
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
              date: { type: 'string', format: 'date', description: 'Fecha de la cita en formato YYYY-MM-DD.' },
              time: { type: 'string', format: 'time', description: 'Hora de la cita en formato HH:MM.' },
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
              patient_name: { type: 'string', description: 'Nombres y Apellidos del paciente.' },
              patient_id_number: { type: 'string', description: 'Número de identificación del paciente.' },
              phone_number: { type: 'string', description: 'Número de teléfono del paciente.' },
              appointment_date: { type: 'string', format: 'date-time', description: 'Fecha y hora de la cita en formato ISO 8601.' },
              appointment_type: { type: 'string', description: 'Tipo de cita (Consulta General o Odontología).' },

              notes: { type: 'string', description: 'Notas adicionales para la cita.' },
            },
            required: ['patient_name', 'patient_id_number', 'phone_number', 'appointment_date'],
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
    // Function to check if general scheduling is enabled
    if (clinicSettings && clinicSettings.scheduling_enabled === false) {
      console.log("Scheduling is disabled globally.");
      const disabledMessage = "Lo siento, el agendamiento de citas está inhabilitado temporalmente. Por favor, intenta más tarde o contacta directamente a la clínica.";
      await supabaseClient.from('messages').insert({
        user_id: userId,
        phone_number: from,
        message_content: disabledMessage,
        sender: 'assistant',
        received_at: new Date().toISOString(),
      });
      return new Response(`<Response><Message>${disabledMessage}</Message></Response>`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      });
    }



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
        .select('id, patient_name, appointment_date, appointment_type, status')
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber);
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query.order('appointment_date', { ascending: false });
      if (error) throw error;
      return data;
    };

    // New helper to get blocked slots
    const getBlockedSlots = async (date: string) => {
      const { data, error } = await supabaseClient
        .from('blocked_slots')
        .select('start_time')
        .eq('clinic_id', userId) // Assuming clinic_settings.id is what we use as clinic identifier? or just filtered by 'clinic_id' if we added it?
        // Actually, in previous steps we assumed single tenant per user or something. 
        // The table `blocked_slots` has `clinic_id`. `clinicSettings.id` is the `id` of `clinic_settings`.
        .eq('date', date);

      if (error) {
        console.error("Error fetching blocked slots:", error);
        return [];
      }
      return data.map(s => s.start_time.substring(0, 5)); // HH:MM
    };

    // Helper to check existing appointments for a specific date using ID (Strict duplicate check)
    const getUserAppointmentOnDateById = async (patientIdNumber: string, date: string) => {
      const { data, error } = await supabaseClient
        .from('appointments')
        .select('id')
        .eq('user_id', userId)
        .eq('patient_id_number', patientIdNumber)
        .gte('appointment_date', `${date}T00:00:00`)
        .lt('appointment_date', `${date}T23:59:59`)
        .neq('status', 'cancelled');

      if (error) throw error;
      return data.length > 0;
    };


    const callTool = async (toolCall: any) => {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      // --- STRICT BUSINESS RULES ---
      const TIMEZONE = clinicTimezone;

      // Calculate 'tomorrow' based on the CLINIC'S TIMEZONE, not UTC
      const getTomorrowString = (timezone: string) => {
        try {
          console.log(`Calculating tomorrow for timezone: ${timezone}`);
          const now = new Date();
          const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          const todayStr = formatter.format(now); // "2026-01-04"
          console.log(`Today string: ${todayStr}`);

          const todayDate = new Date(todayStr + "T00:00:00");
          const tomorrowDate = new Date(todayDate);
          tomorrowDate.setDate(tomorrowDate.getDate() + 1);

          const result = tomorrowDate.toISOString().split('T')[0];
          console.log(`Tomorrow string: ${result}`);
          return result;
        } catch (e) {
          console.error("Error calculating tomorrow with timezone:", e);
          // Fallback to simple UTC check if Intl fails
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.toISOString().split('T')[0];
        }
      };

      const tomorrowStr = getTomorrowString(TIMEZONE);

      // Fixed slots generation: 7:00 to 16:00 (4:00 PM), 30 min intervals
      // 07:00, 07:30, ... 15:30 (last slot starts at 15:30 ends at 16:00)
      // Actually "until 4pm". Usually means open until 4pm.
      // If we assume last appointment ends at 4pm, then last slot is 15:30.
      const FIXED_SLOTS = [
        "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
        "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
        "15:00", "15:30"
      ];


      try {
        switch (functionName) {
          case 'check_availability': {
            let { date, time } = args;
            // Rule: Only tomorrow allowed.
            if (date !== tomorrowStr) {
              return `Lo siento, por políticas de la clínica, las citas solo se pueden agendar para el día de mañana (${tomorrowStr}). No es posible agendar para hoy ni para otras fechas.`;
            }
            // Rule: Fixed slots 7am-4pm
            if (time && !FIXED_SLOTS.includes(time.substring(0, 5))) {
              return `El horario solicitado (${time}) no es válido. Las citas son de 30 minutos y están disponibles únicamente entre las 7:00 a.m. y las 4:00 p.m.`;
            }
            const blockedSlots = await getBlockedSlots(tomorrowStr);
            let availableOptions: string[] = [];
            for (const slot of FIXED_SLOTS) {
              if (blockedSlots.includes(slot)) continue;
              const slotStart = `${date}T${slot}:00`;
              const { data: existingAppts } = await supabaseClient
                .from('appointments')
                .select('id')
                .eq('user_id', userId)
                .eq('appointment_date', slotStart)
                .in('status', ['pending', 'confirmed']);
              if (!existingAppts || existingAppts.length === 0) {
                availableOptions.push(slot);
              }
            }
            if (availableOptions.length === 0) {
              return `Lo siento, no hay horarios disponibles para mañana ${tomorrowStr}.`;
            }
            return `Horarios disponibles para mañana ${tomorrowStr}: ${availableOptions.map(o => o.split(' ')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}. (Horario de atención: 7:00 AM - 4:00 PM).`;
          }

          case 'create_appointment': {
            let { patient_name, patient_id_number, phone_number, appointment_date, appointment_type, notes } = args;
            console.log(`Creating appointment with date: ${appointment_date}`);

            if (!appointment_type) appointment_type = 'Consulta General';

            // Robust Date Parsing
            let dateStr, timeStr;
            try {
              // Determine if we have ISO string or simple YYYY-MM-DD HH:MM
              // OpenAI usually sends ISO "2026-01-05T11:00:00"
              if (appointment_date.includes('T')) {
                const parts = appointment_date.split('T');
                dateStr = parts[0];
                timeStr = parts[1].substring(0, 5);
              } else {
                // Fallback/Safety
                const d = new Date(appointment_date);
                dateStr = d.toISOString().split('T')[0];
                timeStr = d.toISOString().split('T')[1].substring(0, 5);
              }
            } catch (err) {
              console.error("Error parsing date:", err);
              return "Error al procesar la fecha de la cita. Por favor verifique el formato.";
            }

            // Reconstruct the appointment_date in Colombia timezone
            const colombiaOffset = '-05:00';
            const appointment_date_colombia = `${dateStr}T${timeStr}:00${colombiaOffset}`;

            // Rule: Only tomorrow allowed
            if (dateStr !== tomorrowStr) {
              return `No se puede agendar la cita. Solo se permiten citas para el día de mañana (${tomorrowStr}).`;
            }

            // Rule: Check 1 appointment per user rule BY ID
            const hasExisting = await getUserAppointmentOnDateById(patient_id_number, dateStr);
            if (hasExisting) {
              return `No se puede agendar la cita. Ya existe una cita programada para el paciente con identificación ${patient_id_number} en esta fecha.`;
            }

            // Rule: Validate Slot
            if (!FIXED_SLOTS.includes(timeStr)) {
              return `Hora inválida. Los horarios permitidos son de 7:00 a 16:00 en intervalos de 30 minutos.`;
            }

            // Rule: Check if slot is blocked manually
            const blockedSlots = await getBlockedSlots(dateStr);
            if (blockedSlots.includes(timeStr)) {
              return `Lo siento, el horario de las ${timeStr} no está disponible.`;
            }

            // Capacity logic in booking
            const { data: existingApptsAtTime } = await supabaseClient
              .from('appointments')
              .select('id')
              .eq('user_id', userId)
              .eq('appointment_date', appointment_date_colombia)
              .in('status', ['pending', 'confirmed']);

            if (existingApptsAtTime && existingApptsAtTime.length > 0) {
              return `Lo siento, el horario de las ${timeStr} ya está ocupado. Por favor elige otro horario.`;
            }

            // Create Patient if needed
            let patient = await getPatient(phone_number);
            if (!patient) {
              const nameParts = patient_name.split(' ');
              const firstName = nameParts[0] || 'Paciente';
              const lastName = nameParts.slice(1).join(' ') || 'Anónimo';
              patient = await createPatient(phone_number, firstName, lastName);
            }

            // Insert Appointment
            const { data, error } = await supabaseClient
              .from('appointments')
              .insert({
                user_id: userId,
                phone_number,
                patient_name,
                patient_id_number,
                appointment_date: appointment_date_colombia,
                appointment_type,
                doctor_id: null,
                notes,
                status: 'pending',
              })
              .select('id')
              .single();

            if (error) {
              console.error("Error inserting appointment:", error);
              throw error;
            }

            return `¡Cita agendada con éxito!
             📅 Fecha: ${dateStr}
             ⏰ Hora: ${timeStr}
             🆔 ID: ${data.id}
             Estado: Pendiente.`;
          }

          case 'get_clinic_info': {
            const { clinic_name, clinic_address, clinic_phone, clinic_email, working_hours, services, about_clinic } = clinicSettings;
            let info = `Nombre de la clínica: ${clinic_name}.`;
            if (about_clinic) info += ` Descripción: ${about_clinic}.`;
            if (clinic_address) info += ` Dirección: ${clinic_address}.`;
            if (clinic_phone) info += ` Teléfono: ${clinic_phone}.`;
            if (clinic_email) info += ` Email: ${clinic_email}.`;
            if (services && services.length > 0) info += ` Servicios: ${services.join(', ')}.`;
            info += ` Horarios de atención: Lunes a Domingo de 7:00 AM a 4:00 PM.`;
            return info;
          }
          default:
            return `Función ${functionName} no reconocida.`;
        }
      } catch (error: any) {
        console.error(`CRITICAL ERROR in callTool (${functionName}):`, error);
        return `Ocurrió un error técnico al procesar tu solicitud: ${error.message}`;
      }
    };

    // --- OpenAI Chat Completion ---
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Usar el modelo gpt-4o
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
          model: 'gpt-4o',
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
        is_read: true,
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