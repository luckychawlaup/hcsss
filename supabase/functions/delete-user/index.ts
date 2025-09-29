import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

// Common CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Use your specific domain instead of "*" in production!
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Parse request JSON safely
    let reqJson;
    try {
      reqJson = await req.json();
    } catch {
      throw new Error("Invalid request body: Must be JSON with 'uid'");
    }

    // uid validation
    const { uid } = reqJson;
    if (!uid || typeof uid !== "string") {
      throw new Error("Missing or invalid 'uid' in request body.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);

    if (error) {
      throw error;
    }

    // Success response
    return new Response(JSON.stringify({ message: `User ${uid} deleted successfully` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Error response, always JSON
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
