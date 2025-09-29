
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

async function handler(req: Request) {
  const { uid } = await req.json();

  const supabaseAdmin = createClient(
    Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);

  if (error) {
    throw error;
  }

  return new Response(JSON.stringify({ message: `User ${uid} deleted successfully` }), { status: 200 });
}

serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || "*";
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const response = await handler(req);
    const responseBody = await response.text();
    const responseHeaders = new Headers(response.headers);
    
    // Set CORS headers on the actual response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
