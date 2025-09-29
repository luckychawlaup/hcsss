
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { v4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";
import { SmtpClient } from "https://deno.land/x/denomailer@1.0.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to send the password reset email
async function sendResetEmail(recipientEmail: string, resetLink: string) {
  const client = new SmtpClient();

  const ZOHO_EMAIL = Deno.env.get("ZOHO_EMAIL");
  const ZOHO_APP_PASSWORD = Deno.env.get("ZOHO_APP_PASSWORD");

  if (!ZOHO_EMAIL || !ZOHO_APP_PASSWORD) {
    console.error("Zoho email credentials are not set in environment variables.");
    // We don't throw an error here to allow the link to still be generated for manual sending
    return;
  }

  try {
    await client.connectTLS({
      hostname: "smtp.zoho.in", // Zoho SMTP server for .in domain
      port: 587, // Standard port for TLS
      username: ZOHO_EMAIL,
      password: ZOHO_APP_PASSWORD,
    });

    await client.send({
      from: `Hilton Convent School <${ZOHO_EMAIL}>`,
      to: recipientEmail,
      subject: "Set Your Password for Hilton Convent School",
      html: `
        <h1>Welcome to Hilton Convent School</h1>
        <p>Please use the link below to set your password. This link is valid for one hour.</p>
        <p><a href="${resetLink}">Set Your Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    await client.close();
    console.log(`Password reset email sent successfully to ${recipientEmail}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    // Even if email fails, we don't want to block the user flow. The link can still be copied manually.
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { mode, email, new_password, token, adminData } = await req.json();
    const origin = req.headers.get("origin") || "http://localhost:9002";


    // 1. Admin creation + password reset request
    if (mode === "create_and_request_reset") {
      if (!adminData?.email) throw new Error("adminData.email is required");
      const userEmail = adminData.email;

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existingUser = users.find(u => u.email === userEmail);
      
      let userId;
      if (existingUser) {
        throw new Error("An admin with this email already exists.");
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { full_name: adminData.name, role: adminData.role }
        });
        if (createError) throw new Error(`User creation failed: ${createError.message}`);
        userId = newUser.user.id;
      }
      
      await supabaseAdmin.from('admin_roles').upsert([{ uid: userId, ...adminData }], { onConflict: 'uid' });

      const resetToken = v4.generate();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await supabaseAdmin.from("password_resets").insert([{ user_id: userId, token: resetToken, expires_at: expiresAt, used: false }]);
      
      const resetLink = `${origin}/auth/update-password?token=${resetToken}`;
      await sendResetEmail(userEmail, resetLink);

      return new Response(JSON.stringify({ message: "Admin created and email sent.", token: resetToken, email: userEmail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

    // 2. Request a password reset for an existing user
    if (mode === 'request') {
      if (!email) throw new Error("Email is required for password reset request.");
      
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      const user = users.find((u) => u.email === email);
      if (!user) throw new Error("User not found");

      const resetToken = v4.generate();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await supabaseAdmin.from("password_resets").insert([{ user_id: user.id, token: resetToken, expires_at: expiresAt, used: false }]);

      const resetLink = `${origin}/auth/update-password?token=${resetToken}`;
      await sendResetEmail(email, resetLink);

      return new Response(JSON.stringify({ message: "Password reset token generated and email sent.", token: resetToken, email: email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

    // 3. Password update using custom token
    if (mode === "reset") {
      if (!token || !new_password) throw new Error("Token and new password required");

      const { data, error } = await supabaseAdmin.from("password_resets").select("*").eq("token", token).eq("used", false).single();

      if (error || !data) throw new Error("Invalid or expired token");
      if (new Date(data.expires_at) < new Date()) throw new Error("Token expired");

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: new_password });
      if (updateError) throw updateError;

      await supabaseAdmin.from("password_resets").update({ used: true }).eq("id", data.id);

      return new Response(JSON.stringify({ message: "Password changed successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

    throw new Error("Invalid mode specified.");
  } catch (error) {
    console.error("Edge function error:", error.message);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
    });
  }
});
