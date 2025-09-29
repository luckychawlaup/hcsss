import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { generate as uuidGenerate } from "https://deno.land/std@0.168.0/uuid/v4.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Set to your frontend domain for prod!
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};

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
      if (!adminData?.email) throw new Error("adminData.email required");
      const userEmail = adminData.email;
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existingUser = users.find(u => u.email === userEmail);

      let userId;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new admin user with random password
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          password: uuidGenerate(),
          email_confirm: true,
          user_metadata: {
            full_name: adminData.name,
            role: adminData.role
          }
        });
        if (createError) throw new Error(`User creation failed: ${createError.message}`);
        userId = newUser.user.id;
      }

      // Upsert role in admin_roles table
      const { error: roleError } = await supabaseAdmin.from('admin_roles').upsert([
        { uid: userId, ...adminData }
      ], { onConflict: 'uid' });
      if (roleError) {
        if (!existingUser) await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`DB role assignment failed: ${roleError.message}`);
      }

      // Generate password reset token
      const resetToken = uuidGenerate();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      const { error: prError } = await supabaseAdmin.from("password_resets").insert([
        { user_id: userId, token: resetToken, expires_at: expiresAt, used: false }
      ]);
      if (prError) throw prError;

      return new Response(JSON.stringify({ message: "Admin created, reset token generated.", token: resetToken }), {
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

      const resetToken = uuidGenerate();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { error: prError } = await supabaseAdmin.from("password_resets").insert([
        { user_id: user.id, token: resetToken, expires_at: expiresAt, used: false }
      ]);
      if (prError) throw prError;

      return new Response(JSON.stringify({
        message: "Reset token generated.",
        token: resetToken
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

    // 3. Password update
    if (mode === "reset") {
      if (!token || !new_password) throw new Error("Token and new password required");

      const { data, error } = await supabaseAdmin
        .from("password_resets")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .single();

      if (error || !data) throw new Error("Invalid or expired token");
      if (new Date(data.expires_at) < new Date()) throw new Error("Token expired");

      // Update the user's password via Supabase Admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password: new_password
      });
      if (updateError) throw updateError;

      // Mark token as used
      await supabaseAdmin
        .from("password_resets")
        .update({ used: true })
        .eq("id", data.id);

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
