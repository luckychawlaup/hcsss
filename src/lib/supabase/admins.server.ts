
'use server'

import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/imagekit";

const supabase = createClient();
const ADMIN_ROLES_TABLE = 'admin_roles';

export const addAdmin = async (formData: FormData) => {
    const adminData = Object.fromEntries(formData.entries());
    const photo = formData.get('photo') as File;

    // 1. Sign up the user in Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
        email: adminData.email as string,
        password: crypto.randomUUID(), 
        options: {
            data: {
                role: adminData.role,
                full_name: adminData.name,
            },
            email_confirm: true, // Auto-confirm the email
        }
    });

    if (signUpError) {
        console.error("Error creating admin auth user:", signUpError);
        throw new Error(signUpError.message);
    }
    
    const user = data.user;
    if (!user) {
        throw new Error("User not created in Supabase Auth.");
    }

    try {
        // 2. Upload photo to ImageKit
        const fileBuffer = Buffer.from(await photo.arrayBuffer());
        const photoUrl = await uploadImage(fileBuffer, photo.name, 'staff_profiles');

        // 3. Insert profile into admin_roles table
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
                photo_url: photoUrl
            });

        if (dbError) {
            // If DB insert fails, delete the auth user to prevent orphans
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            throw new Error(`Failed to create admin profile: ${dbError.message}`);
        }
        
        // 4. Send password reset email for them to set their password
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminData.email as string);

        if (resetError) {
            console.warn("Admin account created, but failed to send password set email:", resetError.message);
        }

    } catch (e: any) {
        // Cleanup auth user if any step fails after its creation
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
    
    return { message: "Admin account created. They will receive an email to set their password." };
};
