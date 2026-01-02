import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Parse the incoming request body (Twilio sends form-urlencoded data)
    const formData = await req.formData();
    const from = formData.get('From')?.toString(); // Sender's WhatsApp number
    const body = formData.get('Body')?.toString(); // Message content

    if (!from || !body) {
      return new Response(JSON.stringify({ error: 'Missing From or Body in Twilio request' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`Received message from ${from}: ${body}`);

    // --- Step 1: Persist the incoming message in the 'messages' table ---
    // For now, we'll use a placeholder user_id. In a real scenario, you might
    // associate this with a clinic's user_id or a system user.
    // Assuming a single clinic user for simplicity, or you'd need a way to map 'from' to 'user_id'
    const { data: clinicSettings, error: settingsError } = await supabaseClient
      .from('clinic_settings')
      .select('id')
      .limit(1)
      .single();

    if (settingsError || !clinicSettings) {
      console.error('Error fetching clinic settings for user_id:', settingsError);
      // Fallback or error response
      return new Response('<Response><Message>Lo siento, no pude procesar tu solicitud en este momento. Por favor, inténtalo más tarde.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 500,
      });
    }
    const userId = clinicSettings.id; // Use the clinic_settings ID as the user_id

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
      console.error('Error inserting message:', messageInsertError);
      // Continue processing, but log the error
    }

    // --- Step 2: Implement conversation state logic (placeholder) ---
    // Fetch or create conversation state for this phone number
    let { data: conversationState, error: fetchStateError } = await supabaseClient
      .from('conversation_state')
      .select('*')
      .eq('phone_number', from)
      .eq('user_id', userId)
      .single();

    if (fetchStateError && fetchStateError.code === 'PGRST116') { // No rows found
      // Create new conversation state
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
        // Fallback or error response
        return new Response('<Response><Message>Lo siento, no pude iniciar la conversación. Por favor, inténtalo más tarde.</Message></Response>', {
          headers: { 'Content-Type': 'text/xml' },
          status: 500,
        });
      }
      conversationState = newConversationState;
    } else if (fetchStateError) {
      console.error('Error fetching conversation state:', fetchStateError);
      // Fallback or error response
      return new Response('<Response><Message>Lo siento, no pude recuperar el estado de la conversación. Por favor, inténtalo más tarde.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 500,
      });
    }

    // --- Step 3: Integrate with OpenAI (GPT-4o-mini) and Function Calling (PLACEHOLDER) ---
    // This is where the core AI logic would go.
    // For now, we'll send a simple canned response.
    let aiResponseContent = "¡Hola! Soy Laura AI. Gracias por tu mensaje. Estoy aprendiendo a ayudarte mejor. ¿Cómo puedo asistirte hoy?";

    // In a real scenario, you would:
    // 1. Fetch recent messages for context (e.g., last 10-15 messages from 'messages' table)
    // 2. Call OpenAI API with the conversation history and available function tools
    // 3. Process OpenAI's response (text or function call)
    // 4. If function call, execute the function (e.g., check_availability, create_appointment)
    // 5. Update conversation_state based on the interaction
    // 6. Construct the final response message

    // Example of updating conversation state (for demonstration)
    const newStep = body.toLowerCase().includes('cita') ? 'scheduling' : 'initial';
    const { error: updateStateError } = await supabaseClient
      .from('conversation_state')
      .update({
        current_step: newStep,
        updated_at: new Date().toISOString(),
        // You would update temp_data with relevant info from OpenAI/function calls
        temp_data: { last_message: body, last_response: aiResponseContent },
      })
      .eq('phone_number', from)
      .eq('user_id', userId);

    if (updateStateError) {
      console.error('Error updating conversation state:', updateStateError);
    }

    // --- Step 4: Send response via Twilio (Twiml format) ---
    const twimlResponse = `<Response><Message>${aiResponseContent}</Message></Response>`;

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Twilio webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});