
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
    const { email, user_metadata } = await req.json();

    if (!email) {
      throw new Error("Email is required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("PROJECT_SUPABASE_URL") ?? "",
      Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ?? ""
    );

    // Create user without a password. Supabase will handle sending an invitation.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm the email to allow immediate login after password set
      user_metadata,
    });

    if (error) {
      throw new Error(error.message);
    }
    
    if (!data.user) {
        throw new Error("User creation did not return a user object.");
    }

    // Now, generate the password reset link (which acts as a setup link)
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (resetError) {
      // If this fails, we should still return the user, but log the error
      console.error('Failed to generate magic link for new user:', resetError.message);
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
