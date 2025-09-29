

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { v4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      if (!adminData?.email) throw new Error("adminData.email is required");
      const userEmail = adminData.email;

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existingUser = users.find(u => u.email === userEmail);
      
      let userId;
      if (existingUser) {
        // If user exists, we can't create them, but we can still proceed to generate a reset token for them if needed.
        // For now, we'll throw an error to prevent accidental overwrites of admin roles.
        // A more advanced flow could update existing users.
        throw new Error("An admin with this email already exists.");
      } else {
        // Create the user if they don't exist
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          password: crypto.randomUUID(), // Secure random password
          email_confirm: true,
          user_metadata: { full_name: adminData.name, role: adminData.role }
        });
        if (createError) throw new Error(`User creation failed: ${createError.message}`);
        userId = newUser.user.id;
      }
      
      // Add user to the admin_roles table
      const { error: roleError } = await supabaseAdmin.from('admin_roles').upsert([{ uid: userId, ...adminData }], { onConflict: 'uid' });
      if (roleError) {
        // If role assignment fails, delete the newly created auth user to prevent orphans
        if (!existingUser) await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`DB role assignment failed: ${roleError.message}`);
      }

      // Generate and store custom reset token
      const resetToken = v4.generate();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry
      const { error: prError } = await supabaseAdmin.from("password_resets").insert([{ user_id: userId, token: resetToken, expires_at: expiresAt, used: false }]);
      if (prError) throw prError;
      
      return new Response(JSON.stringify({ message: "Admin created successfully.", token: resetToken, email: userEmail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

    // 2. Request a password reset for an existing user
    if (mode === 'request') {
      if (!email) throw new Error("Email is required for password reset request.");
      
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const user = users.find(u => u.email === email);
      if (!user) throw new Error("User not found.");

      const resetToken = v4.generate();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { error: prError } = await supabaseAdmin.from("password_resets").insert([{ user_id: user.id, token: resetToken, expires_at: expiresAt, used: false }]);
      if (prError) throw prError;

      return new Response(JSON.stringify({ message: "Password reset token generated.", token: resetToken, email: email }), {
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
