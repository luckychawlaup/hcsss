
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { v4 as uuidv4 } from "https://deno.land/std@0.168.0/uuid/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateToken() {
  return uuidv4.generate();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { mode, email, token, new_password } = await req.json();

    if (mode === "request") {
      if (!email) throw new Error("Email required");
      
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      if (userError || !user) throw new Error("User not found");

      const resetToken = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      await supabaseAdmin.from("password_resets").insert([
        { user_id: user.user.id, token: resetToken, expires_at: expiresAt.toISOString(), used: false }
      ]);
      
      // In a real app, you'd send an email here.
      // For this app, we return the token directly so the user can be redirected.
      return new Response(JSON.stringify({ 
        message: "Reset token generated. In a real app, an email would be sent.", 
        token: resetToken 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

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

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password: new_password
      });

      if (updateError) throw updateError;

      await supabaseAdmin
        .from("password_resets")
        .update({ used: true })
        .eq("id", data.id);

      return new Response(JSON.stringify({ message: "Password changed successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

    throw new Error("Invalid mode specified. Must be 'request' or 'reset'.");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
    });
  }
});
