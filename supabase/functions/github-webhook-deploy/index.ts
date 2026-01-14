import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-github-event, x-github-delivery, x-hub-signature-256",
};

interface DeploymentLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'command';
}

interface DeploymentRequest {
  action: 'deploy' | 'rollback' | 'status';
  branch?: string;
}

// Verify GitHub webhook signature
async function verifyGitHubSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: DeploymentLog[] = [];
  const log = (message: string, type: DeploymentLog['type'] = 'info') => {
    logs.push({ timestamp: new Date().toISOString(), message, type });
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a GitHub webhook
    const githubEvent = req.headers.get("x-github-event");
    const githubSignature = req.headers.get("x-hub-signature-256");
    
    if (githubEvent) {
      // Handle GitHub webhook
      const payload = await req.text();
      const webhookSecret = Deno.env.get("GITHUB_WEBHOOK_SECRET");
      
      // Verify signature if secret is configured
      if (webhookSecret && githubSignature) {
        const isValid = await verifyGitHubSignature(payload, githubSignature, webhookSecret);
        if (!isValid) {
          log("Invalid webhook signature", "error");
          return new Response(
            JSON.stringify({ error: "Invalid signature", logs }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      const data = JSON.parse(payload);
      
      // Only process push events to main/master branch
      if (githubEvent === "push") {
        const branch = data.ref?.replace("refs/heads/", "");
        if (branch !== "main" && branch !== "master") {
          log(`Ignoring push to non-default branch: ${branch}`, "info");
          return new Response(
            JSON.stringify({ message: "Skipped - non-default branch", logs }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        log(`Received push to ${branch} branch`, "info");
        log(`Commit: ${data.head_commit?.message || "No message"}`, "info");
        
        // Log deployment activity
        await supabase.from("activity_logs").insert({
          action_type: "GITHUB_DEPLOYMENT",
          description: `GitHub deployment triggered - ${data.head_commit?.message?.substring(0, 100) || "Push to " + branch}`,
          user_id: null
        });

        // Return deployment instructions for the server
        return new Response(
          JSON.stringify({
            success: true,
            action: "deploy",
            branch,
            commit: data.head_commit?.id,
            message: data.head_commit?.message,
            commands: [
              `cd /var/www/app && git fetch origin ${branch}`,
              `git reset --hard origin/${branch}`,
              "npm install --legacy-peer-deps",
              "npm run build",
              "pm2 restart all || systemctl restart app"
            ],
            logs
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ message: `Event ${githubEvent} received`, logs }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle manual deployment requests from admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: DeploymentRequest = await req.json();
    log(`Admin deployment request: ${body.action}`, "info");

    switch (body.action) {
      case "deploy":
        log("Preparing deployment commands...", "info");
        log("git fetch origin main", "command");
        log("git reset --hard origin/main", "command");
        log("npm install --legacy-peer-deps", "command");
        log("npm run build", "command");
        
        await supabase.from("activity_logs").insert({
          action_type: "ADMIN_DEPLOYMENT",
          description: `Manual deployment triggered by admin`,
          user_id: user.id
        });

        return new Response(
          JSON.stringify({
            success: true,
            action: "deploy",
            commands: [
              "cd /var/www/app",
              "cp -r dist dist.backup 2>/dev/null || true",
              "git fetch origin main",
              "git reset --hard origin/main",
              "npm install --legacy-peer-deps",
              "npm run build",
              "pm2 restart all || systemctl restart app"
            ],
            logs
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );

      case "rollback":
        log("Preparing rollback commands...", "info");
        log("Restoring previous build from backup...", "command");
        
        await supabase.from("activity_logs").insert({
          action_type: "DEPLOYMENT_ROLLBACK",
          description: `Deployment rollback triggered by admin`,
          user_id: user.id
        });

        return new Response(
          JSON.stringify({
            success: true,
            action: "rollback",
            commands: [
              "cd /var/www/app",
              "rm -rf dist",
              "mv dist.backup dist",
              "pm2 restart all || systemctl restart app"
            ],
            logs
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );

      case "status":
        return new Response(
          JSON.stringify({
            success: true,
            action: "status",
            commands: [
              "cd /var/www/app && git log -1 --format='%H %s'",
              "pm2 status || systemctl status app"
            ],
            logs
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
  } catch (error: any) {
    log(`Error: ${error.message}`, "error");
    return new Response(
      JSON.stringify({ error: error.message, logs }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
