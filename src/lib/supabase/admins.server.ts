
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
                avatar_url: adminData.photo_url || null,
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
                phone_number: adminData.phone_number || null,
                address: adminData.address || null,
                dob: adminData.dob,
                photo_url: adminData.photo_url || null,
                gender: adminData.gender,
                joining_date: adminData.joining_date ? new Date(adminData.joining_date as string).toISOString() : null,
                aadhar_number: adminData.aadhar_number || null,
                pan_number: adminData.pan_number || null,
                work_experience: adminData.work_experience || null,
                bank_account: adminData.bank_account ? JSON.parse(adminData.bank_account as string) : null,
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


export const updateAdmin = async (formData: FormData) => {
    const supabase = createClient();
    const adminData = Object.fromEntries(formData.entries());
    const uid = adminData.uid as string;

    if (!uid) {
        throw new Error("UID is required to update an admin.");
    }

    // Omit uid and role from the update payload
    const { uid: _, role, ...updatePayload } = adminData;
    
    // Parse bank_account if it's a string
    if (typeof updatePayload.bank_account === 'string') {
        updatePayload.bank_account = JSON.parse(updatePayload.bank_account);
    }

    const { error: dbError } = await supabase
        .from(ADMIN_ROLES_TABLE)
        .update(updatePayload)
        .eq('uid', uid);

    if (dbError) {
        console.error("Error updating admin profile:", dbError);
        throw new Error(`Failed to update admin profile: ${dbError.message}`);
    }

    return { message: "Admin account updated successfully." };
};
