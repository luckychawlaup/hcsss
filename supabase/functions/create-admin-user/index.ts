
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const OWNER_UID = "6bed2c29-8ac9-4e2b-b9ef-26877d42f050";

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: callingUser } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (!callingUser || callingUser.id !== OWNER_UID) {
      throw new Error("Only the owner can create new administrators.");
    }

    const { adminData } = await req.json();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminData.email,
      email_confirm: true,
      user_metadata: {
        full_name: adminData.name,
        role: adminData.role,
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Could not create user.");

    const finalAdminData = {
      uid: authData.user.id,
      role: adminData.role,
      name: adminData.name,
      email: adminData.email,
      dob: adminData.dob.split('/').reverse().join('-'),
      phone_number: adminData.phone_number,
      address: adminData.address || null,
    };

    const { error: dbError } = await supabaseAdmin.from('admin_roles').insert([finalAdminData]);

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw dbError;
    }

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(adminData.email, {
      redirectTo: `${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/auth/update-password`
    });

    if (resetError) {
      console.warn("User created, but password reset email failed to send.", resetError);
    }
    
    return new Response(JSON.stringify({ user: authData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
