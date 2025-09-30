// This edge function has been deprecated and is no longer in use.
// The standard Supabase auth flow is now used for all password resets.
// This file can be safely deleted.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  return new Response(
    JSON.stringify({
      error: "This function is deprecated and should not be called.",
    }),
    {
      status: 410, // Gone
      headers: { "Content-Type": "application/json" },
    }
  );
});
