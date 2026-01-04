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

// Sanitize user input for HTML email content to prevent XSS
const sanitizeHtml = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Invalid or expired token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", user.id);

    // Check if user is admin or agent
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "agent"])
      .single();

    if (roleError || !userRole) {
      console.error("User is not authorized to send notifications:", roleError?.message);
      return new Response(
        JSON.stringify({ error: "Not authorized to send notifications" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User role verified:", userRole.role);

    const { type, ticket_id, recipient_email, recipient_name, ticket_subject, new_status, responder_name, response_preview }: NotificationRequest = await req.json();

    // Validate required fields
    if (!type || !ticket_id || !recipient_email || !recipient_name || !ticket_subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    if (!isValidEmail(recipient_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate type
    if (!["status_changed", "new_response"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending notification:", { type, ticket_id, recipient_email });

    // Sanitize all user-provided content for HTML
    const safeRecipientName = sanitizeHtml(recipient_name);
    const safeTicketSubject = sanitizeHtml(ticket_subject);
    const safeNewStatus = sanitizeHtml(new_status || '');
    const safeResponderName = sanitizeHtml(responder_name || '');
    const safeResponsePreview = sanitizeHtml(response_preview || '');

    let subject: string;
    let html: string;

    if (type === "status_changed") {
      subject = `Support Ticket Update: ${safeTicketSubject}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Support Ticket Update</h2>
          <p>Hello ${safeRecipientName},</p>
          <p>Your support ticket <strong>"${safeTicketSubject}"</strong> has been updated.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>New Status:</strong> ${safeNewStatus.replace('_', ' ').toUpperCase()}</p>
          </div>
          <p>Please log in to view the full details of your ticket.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from StableCoin Support.
          </p>
        </div>
      `;
    } else {
      subject = `New Response: ${safeTicketSubject}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Response on Your Ticket</h2>
          <p>Hello ${safeRecipientName},</p>
          <p>You have received a new response on your support ticket <strong>"${safeTicketSubject}"</strong>.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${safeResponderName}</p>
            <p style="margin: 0;">${safeResponsePreview}</p>
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
      JSON.stringify({ error: "Failed to send notification" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
