
'use server'

import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES_TABLE = 'admin_roles';

const generateEmployeeId = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}


export const addAdmin = async (formData: FormData) => {
    const supabase = createClient();
    const adminData = Object.fromEntries(formData.entries());

    const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
            email: adminData.email as string,
            password: crypto.randomUUID(), 
            user_metadata: {
                role: adminData.role,
                full_name: adminData.name,
                avatar_url: adminData.photo_url, // Add photo_url here
            }
        }
    });

    if (functionError) {
        console.error("Error creating admin auth user via function:", functionError);
        throw new Error(functionError.message);
    }

    const user = functionData.user;
    if (!user) {
        throw new Error("User not created in Supabase Auth.");
    }

    try {
        const employee_id = generateEmployeeId(10);

        const { error: dbError } = await supabase
            .from(ADMIN_ROLES_TABLE)
            .insert({ 
                uid: user.id,
                employee_id: employee_id,
                role: adminData.role,
                name: adminData.name,
                email: adminData.email,
                phone_number: adminData.phone_number,
                address: adminData.address,
                dob: adminData.dob,
                photo_url: adminData.photo_url,
                gender: adminData.gender,
                joining_date: adminData.joining_date ? new Date(adminData.joining_date as string).toISOString() : null,
                aadhar_number: adminData.aadhar_number,
                pan_number: adminData.pan_number,
                work_experience: adminData.work_experience,
            });

        if (dbError) {
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            throw new Error(`Failed to create admin profile: ${dbError.message}`);
        }
        
    } catch (e: any) {
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
    
    return { message: "Admin account created successfully." };
};
