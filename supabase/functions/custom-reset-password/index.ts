import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This is your email sending logic.
async function sendPasswordResetEmail(email: string, token: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    throw new Error("Resend API key is not set in environment variables.");
  }
  
  const resetUrl = `${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/auth/update-password?token=${token}`;

  const emailBody = {
    from: "HCSSS <onboarding@resend.dev>",
    to: email,
    subject: "Set Your Password for HCSSS",
    html: `
      <h1>Welcome to HCSSS</h1>
      <p>An account has been created for you. Please click the link below to set your password:</p>
      <a href="${resetUrl}">Set Your Password</a>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(emailBody),
  });

  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(`Failed to send email: ${errorBody.message}`);
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

    const { mode, email, token, new_password, adminData } = await req.json();

    // 1. Admin creation + password reset request
    if (mode === "create_and_request_reset") {
      if (!adminData?.email) throw new Error("adminData.email is required");
      const userEmail = adminData.email;
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existingUser = users.find(u => u.email === userEmail);

      let userId;
      if (existingUser) {
        userId = existingUser.id;
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

      const { error: roleError } = await supabaseAdmin.from('admin_roles').upsert([{ uid: userId, ...adminData }], { onConflict: 'uid' });
      if (roleError) {
        if (!existingUser) await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`DB role assignment failed: ${roleError.message}`);
      }

      const resetToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { error: prError } = await supabaseAdmin.from("password_resets").insert([{ user_id: userId, token: resetToken, expires_at: expiresAt, used: false }]);
      if (prError) throw prError;
      
      await sendPasswordResetEmail(userEmail, resetToken);

      return new Response(JSON.stringify({ message: "Admin created and password setup email sent." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

    // 2. Password reset token request
    if (mode === "request") {
      if (!email) throw new Error("Email required");
      const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) throw userError;
      const user = users.find(u => u.email === email);
      if (!user) throw new Error("User not found");

      const resetToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { error: prError } = await supabaseAdmin.from("password_resets").insert([{ user_id: user.id, token: resetToken, expires_at: expiresAt, used: false }]);
      if (prError) throw prError;
      
      await sendPasswordResetEmail(email, resetToken);

      return new Response(JSON.stringify({ message: "Password reset email sent." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

    // 3. Password update
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
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
    });
  }
});
