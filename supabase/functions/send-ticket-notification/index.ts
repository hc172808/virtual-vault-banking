import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "status_changed" | "new_response";
  ticket_id: string;
  recipient_email: string;
  recipient_name: string;
  ticket_subject: string;
  new_status?: string;
  responder_name?: string;
  response_preview?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, ticket_id, recipient_email, recipient_name, ticket_subject, new_status, responder_name, response_preview }: NotificationRequest = await req.json();

    console.log("Sending notification:", { type, ticket_id, recipient_email });

    let subject: string;
    let html: string;

    if (type === "status_changed") {
      subject = `Support Ticket Update: ${ticket_subject}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Support Ticket Update</h2>
          <p>Hello ${recipient_name},</p>
          <p>Your support ticket <strong>"${ticket_subject}"</strong> has been updated.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>New Status:</strong> ${new_status?.replace('_', ' ').toUpperCase()}</p>
          </div>
          <p>Please log in to view the full details of your ticket.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from StableCoin Support.
          </p>
        </div>
      `;
    } else {
      subject = `New Response: ${ticket_subject}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Response on Your Ticket</h2>
          <p>Hello ${recipient_name},</p>
          <p>You have received a new response on your support ticket <strong>"${ticket_subject}"</strong>.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${responder_name}</p>
            <p style="margin: 0;">${response_preview}</p>
          </div>
          <p>Please log in to view the full conversation and respond.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from StableCoin Support.
          </p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "StableCoin Support <onboarding@resend.dev>",
      to: [recipient_email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
