import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import twilio from 'npm:twilio@4.24.0'; // Cambiado a npm:twilio

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use SERVICE_ROLE_KEY for cron jobs
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Initialize Twilio client
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.error('Missing Twilio environment variables.');
      return new Response(JSON.stringify({ error: 'Missing Twilio credentials' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const twilioClient = twilio(accountSid, authToken);

    // Calculate tomorrow's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Start of tomorrow
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(tomorrow.getDate() + 1); // Start of day after tomorrow

    console.log(`Fetching appointments for tomorrow: ${tomorrow.toISOString()} to ${dayAfterTomorrow.toISOString()}`);

    // Fetch confirmed appointments for tomorrow that haven't had a reminder sent
    const { data: appointments, error: fetchError } = await supabaseClient
      .from('appointments')
      .select('id, patient_name, phone_number, appointment_date, appointment_type, doctors(full_name)')
      .eq('status', 'confirmed')
      .eq('reminder_sent', false)
      .gte('appointment_date', tomorrow.toISOString())
      .lt('appointment_date', dayAfterTomorrow.toISOString());

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      return new Response(JSON.stringify({ error: 'Error fetching appointments' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!appointments || appointments.length === 0) {
      console.log('No confirmed appointments for tomorrow requiring reminders.');
      return new Response(JSON.stringify({ message: 'No appointments found for reminders' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${appointments.length} appointments for reminders.`);

    const sentReminders: string[] = [];
    const failedReminders: string[] = [];

    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.appointment_date);
      const formattedDate = appointmentDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const formattedTime = appointmentDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
      const doctorName = (appointment.doctors as { full_name: string } | null)?.full_name || 'nuestro equipo médico';

      const messageBody = `¡Hola ${appointment.patient_name}! Te recordamos tu cita de ${appointment.appointment_type} con ${doctorName} mañana, ${formattedDate} a las ${formattedTime}. ¡Te esperamos!`;

      try {
        await twilioClient.messages.create({
          from: `whatsapp:${twilioPhoneNumber}`,
          to: `whatsapp:${appointment.phone_number}`,
          body: messageBody,
        });

        // Update appointment status to reminder_sent = true
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({ reminder_sent: true, updated_at: new Date().toISOString() })
          .eq('id', appointment.id);

        if (updateError) {
          console.error(`Error updating reminder_sent for appointment ${appointment.id}:`, updateError);
          failedReminders.push(appointment.id);
        } else {
          sentReminders.push(appointment.id);
          console.log(`Reminder sent and status updated for appointment ${appointment.id}`);
        }
      } catch (twilioError: any) {
        console.error(`Error sending Twilio message for appointment ${appointment.id}:`, twilioError);
        failedReminders.push(appointment.id);
      }
    }

    return new Response(JSON.stringify({
      message: 'Reminder process completed',
      sent: sentReminders.length,
      failed: failedReminders.length,
      sent_ids: sentReminders,
      failed_ids: failedReminders,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in send-reminders Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});