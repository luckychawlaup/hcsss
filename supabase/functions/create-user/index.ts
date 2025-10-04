
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, user_metadata } = await req.json();

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("PROJECT_SUPABASE_URL") ?? "",
      Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata,
    });

    if (error) {
      throw new Error(error.message);
    }
    
    if (!data.user) {
        throw new Error("User creation did not return a user object.");
    }

    return new Response(JSON.stringify({ user: data.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
