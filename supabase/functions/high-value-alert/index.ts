import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HighValueAlertRequest {
  transaction_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  recipient_id: string;
  recipient_name: string;
  amount: number;
  description?: string;
}

// Sanitize user input for HTML email content
const sanitizeHtml = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data: HighValueAlertRequest = await req.json();
    const {
      transaction_id,
      sender_id,
      sender_name,
      sender_email,
      recipient_id,
      recipient_name,
      amount,
      description
    } = data;

    // Validate required fields
    if (!transaction_id || !sender_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing high-value transaction alert:", { transaction_id, amount });

    // Get admin emails for notification
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminEmails: string[] = [];
    if (admins && admins.length > 0) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("email, notify_email")
        .in("user_id", admins.map(a => a.user_id));

      if (adminProfiles) {
        adminProfiles.forEach(p => {
          const email = p.notify_email || p.email;
          if (email) adminEmails.push(email);
        });
      }
    }

    // Format amount
    const formattedAmount = amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });

    // Sanitize inputs
    const safeSenderName = sanitizeHtml(sender_name);
    const safeRecipientName = sanitizeHtml(recipient_name);
    const safeDescription = sanitizeHtml(description || 'N/A');
    const timestamp = new Date().toLocaleString();

    // Email to sender - confirmation of high-value transfer
    if (sender_email) {
      const senderHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ High-Value Transaction Alert</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px;">Hello ${safeSenderName},</p>
            
            <p style="color: #333; font-size: 16px;">A high-value transaction has been initiated from your account. Please verify this activity.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Transaction Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Amount:</td>
                  <td style="padding: 8px 0; color: #e74c3c; font-weight: bold; font-size: 18px;">${formattedAmount} GYD</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Recipient:</td>
                  <td style="padding: 8px 0; color: #333;">${safeRecipientName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Description:</td>
                  <td style="padding: 8px 0; color: #333;">${safeDescription}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Transaction ID:</td>
                  <td style="padding: 8px 0; color: #333; font-family: monospace;">${transaction_id.substring(0, 8)}...</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Time:</td>
                  <td style="padding: 8px 0; color: #333;">${timestamp}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #e74c3c; font-size: 14px; font-weight: bold;">
              ⚠️ If you did not authorize this transaction, please contact support immediately.
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
              This is an automated security notification from StableCoin Banking.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: "StableCoin Security <onboarding@resend.dev>",
        to: [sender_email],
        subject: `⚠️ High-Value Transaction Alert: ${formattedAmount} GYD`,
        html: senderHtml,
      });

      console.log("Sender alert sent to:", sender_email);
    }

    // Email to admins - security monitoring
    if (adminEmails.length > 0) {
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Admin Alert: High-Value Transaction</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px;">A high-value transaction requires monitoring attention.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c0392b;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Transaction Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 40%;">Amount:</td>
                  <td style="padding: 8px 0; color: #c0392b; font-weight: bold; font-size: 20px;">${formattedAmount} GYD</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Sender:</td>
                  <td style="padding: 8px 0; color: #333;">${safeSenderName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Sender ID:</td>
                  <td style="padding: 8px 0; color: #333; font-family: monospace; font-size: 12px;">${sender_id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Recipient:</td>
                  <td style="padding: 8px 0; color: #333;">${safeRecipientName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Recipient ID:</td>
                  <td style="padding: 8px 0; color: #333; font-family: monospace; font-size: 12px;">${recipient_id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Description:</td>
                  <td style="padding: 8px 0; color: #333;">${safeDescription}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Transaction ID:</td>
                  <td style="padding: 8px 0; color: #333; font-family: monospace;">${transaction_id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Time:</td>
                  <td style="padding: 8px 0; color: #333;">${timestamp}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Action Required:</strong> Review this transaction in the admin panel for potential fraud indicators.
              </p>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
              This is an automated admin notification from the StableCoin Security System.<br>
              Transaction ID: ${transaction_id}
            </p>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: "StableCoin Security <onboarding@resend.dev>",
        to: adminEmails,
        subject: `🔔 [ADMIN] High-Value Transaction: ${formattedAmount} GYD from ${safeSenderName}`,
        html: adminHtml,
      });

      console.log("Admin alerts sent to:", adminEmails);
    }

    // Log the security event
    await supabase.from("activity_logs").insert({
      user_id: sender_id,
      action_type: "HIGH_VALUE_ALERT_SENT",
      description: `High-value transaction alert sent for ${formattedAmount} to ${recipient_name}`
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "High-value transaction alerts sent successfully",
        alerts_sent: {
          sender: sender_email ? 1 : 0,
          admins: adminEmails.length
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending high-value alert:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send alerts" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
