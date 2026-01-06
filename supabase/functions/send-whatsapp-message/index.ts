
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import twilio from 'npm:twilio@^4';

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
        console.log("Request received:", req.method, req.url);

        // Log Headers (be careful not to log sensitive keys directly if possible, but for debugging we need Auth)
        // console.log("Headers:", Object.fromEntries(req.headers.entries()));

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        let body;
        try {
            const text = await req.text();
            console.log("Raw body:", text);
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error("Error parsing JSON body:", e);
            throw new Error("Invalid JSON body");
        }

        const { phone_number, message } = body;

        if (!phone_number || !message) {
            console.error("Missing phone_number or message. Body:", body);
            return new Response(JSON.stringify({ error: 'Missing phone_number or message' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

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

        // Send message via Twilio
        console.log(`Sending WhatsApp message to ${phone_number}:`, message);

        // Ensure phone number format for WhatsApp (e.g., whatsapp:+1234567890)
        let toFormatted = phone_number;
        if (!toFormatted.startsWith('whatsapp:')) {
            toFormatted = `whatsapp:${toFormatted}`;
        }

        let fromFormatted = twilioPhoneNumber;
        if (!fromFormatted.startsWith('whatsapp:')) {
            fromFormatted = `whatsapp:${fromFormatted}`;
        }

        const twilioResponse = await twilioClient.messages.create({
            from: fromFormatted,
            to: toFormatted,
            body: message,
        });

        console.log('Twilio response SID:', twilioResponse.sid);

        // Get user from auth header if possible, otherwise try to find owner of conversation
        // Since we are using Service Role, getUser() might not work as expected unless we pass the token manually.
        // However, for now, let's try to get the user from the Authorization header using a separate client or
        // just find the user associated with this phone number in conversation_state or patients.

        let userId = null;
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
            const authClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            );
            const { data: { user } } = await authClient.auth.getUser();
            userId = user?.id;
        }

        // Fallback: If no user found from token (e.g. called from backend logic), try to find by phone
        if (!userId) {
            console.log("No user found in Auth header, checking clinic_settings or conversation_state...");
            // logic to find user... for now leave as null or system
        }

        // Log message to Supabase database
        const { error: dbError } = await supabaseClient
            .from('messages')
            .insert({
                phone_number: phone_number.replace('whatsapp:', ''), // Store clean number
                message_content: message,
                sender: 'assistant', // System sent
                user_id: userId, // Might be null if auth fails, ensure DB allows it or fix schema
                received_at: new Date().toISOString() // Explicitly set this to ensure ordering
            });

        if (dbError) {
            console.error('Error logging message to database:', dbError);
            // Return 200 anyway because the message WAS sent to Twilio
        }

        return new Response(JSON.stringify({
            success: true,
            sid: twilioResponse.sid,
            message: 'Message sent successfully'
        }), {
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
