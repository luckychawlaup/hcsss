
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const OWNER_UID = "6bed2c29-8ac9-4e2b-b9ef-26877d42f050";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const origin = req.headers.get("Origin") || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization Header");

    const { data: { user: callingUser }, error: userFetchError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userFetchError) throw userFetchError;
    if (!callingUser || callingUser.id !== OWNER_UID) {
      throw new Error("Only the owner can create new administrators.");
    }

    let reqJson;
    try {
      reqJson = await req.json();
    } catch {
      throw new Error("Invalid request body: Must be JSON with 'adminData'");
    }
    
    const { adminData } = reqJson;
    if (!adminData || !adminData.email || !adminData.name || !adminData.role) {
      throw new Error("adminData must have email, name, and role.");
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminData.email,
      email_confirm: true,
      user_metadata: {
        full_name: adminData.name,
        role: adminData.role,
      }
    });
    if (authError) throw authError;
    if (!authData?.user?.id) throw new Error("Could not create user.");

    const finalAdminData = {
      uid: authData.user.id,
      role: adminData.role,
      name: adminData.name,
      email: adminData.email,
      dob: adminData.dob ? adminData.dob.split("/").reverse().join("-") : null,
      phone_number: adminData.phone_number ?? null,
      address: adminData.address ?? null,
    };
    const { error: dbError } = await supabaseAdmin.from("admin_roles").insert([finalAdminData]);
    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw dbError;
    }

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(adminData.email, {
       redirectTo: `${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/auth/callback`
    });
    if (resetError) {
      console.warn("User created, but password reset email failed to send.", resetError);
    }

    return new Response(JSON.stringify({ user: authData.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
