import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function can only be called by the Owner.
const OWNER_UID = "6bed2c29-8ac9-4e2b-b9ef-26877d42f050";

serve(async (req) => {
  // This is needed to handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Check if the caller is the owner
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: callingUser } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (!callingUser || callingUser.id !== OWNER_UID) {
        throw new Error("Only the owner can create new administrators.");
    }
    
    // 2. Get the new admin's data from the request body
    const { adminData } = await req.json();

    // 3. Create the new user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminData.email,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
            full_name: adminData.name,
            role: adminData.role,
        }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Could not create user.");

    // 4. Insert the user details into the public.admin_roles table
    const finalAdminData = {
        uid: authData.user.id,
        role: adminData.role,
        name: adminData.name,
        email: adminData.email,
        dob: adminData.dob.split('/').reverse().join('-'), // Convert DD/MM/YYYY to YYYY-MM-DD
        phone_number: adminData.phone_number,
        address: adminData.address,
    };
    
    const { error: dbError } = await supabaseAdmin.from('admin_roles').insert([finalAdminData]);

    if (dbError) {
        // If the DB insert fails, we must roll back by deleting the created auth user.
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw dbError;
    }
    
     // 5. Send a password reset email so they can set their password.
    const { data: resetLink, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: adminData.email,
    });
    
    if (resetError) {
        console.warn("User created, but password reset email failed to send.", resetError);
        // Don't throw an error, as the user is already created. They can use "forgot password".
    }

    return new Response(JSON.stringify({ user: authData.user }), {
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
