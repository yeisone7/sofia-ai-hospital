import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import twilio from 'npm:twilio@^4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key for elevated privileges
    // This is necessary for server-side operations like inserting messages
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', 
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Missing Twilio environment variables. Please ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set.');
    }

    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

    const { to, body, user_id } = await req.json();

    if (!to || !body || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, body, user_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Send message via Twilio WhatsApp API
    const message = await twilioClient.messages.create({
      from: `whatsapp:${twilioPhoneNumber}`,
      to: `whatsapp:${to}`,
      body: body,
    });

    // Persist the outgoing message in the messages table
    const { error: messageInsertError } = await supabaseClient
      .from('messages')
      .insert({
        user_id: user_id,
        phone_number: to,
        message_content: body,
        sender: 'assistant', // Messages sent from the dashboard are considered from the assistant/clinic
        received_at: new Date().toISOString(), // Use received_at for consistency
      });

    if (messageInsertError) {
      console.error('Error inserting outgoing message into database:', messageInsertError);
      // Log the error but still return success if Twilio sent the message
    }

    return new Response(JSON.stringify({ success: true, messageSid: message.sid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in send-whatsapp-message Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});