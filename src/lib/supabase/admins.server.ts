
'use server'

import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES_TABLE = 'admin_roles';

export const addAdmin = async (formData: FormData) => {
    const supabase = createClient();
    const adminData = Object.fromEntries(formData.entries());

    // 1. Create the user in Supabase Auth using the admin method
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminData.email as string,
        password: crypto.randomUUID(), 
        email_confirm: true,
        user_metadata: {
            role: adminData.role,
            full_name: adminData.name,
        },
    });

    if (authError) {
        console.error("Error creating admin auth user:", authError);
        throw new Error(authError.message);
    }
    
    const user = authData.user;
    if (!user) {
        throw new Error("User not created in Supabase Auth.");
    }

    try {
        // 2. Insert profile into admin_roles table
        const { error: dbError } = await supabase
            .from(ADMIN_ROLES_TABLE)
            .insert({ 
                uid: user.id,
                role: adminData.role,
                name: adminData.name,
                email: adminData.email,
                phone_number: adminData.phone_number,
                address: adminData.address,
                dob: adminData.dob,
                photo_url: adminData.photo_url
            });

        if (dbError) {
            // If DB insert fails, delete the auth user to prevent orphans
            await supabase.auth.admin.deleteUser(user.id);
            throw new Error(`Failed to create admin profile: ${dbError.message}`);
        }
        
    } catch (e: any) {
        // Cleanup auth user if any step fails after its creation
        await supabase.auth.admin.deleteUser(user.id);
        throw e;
    }
    
    return { message: "Admin account created. They will receive an email to set their password." };
};

