

'use server'

import { createClient } from "@/lib/supabase/server";

const STUDENTS_COLLECTION = 'students';

export const addStudent = async (formData: FormData) => {
    const supabase = createClient();
    const studentData = Object.fromEntries(formData.entries());

    const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
            email: studentData.email as string,
            password: crypto.randomUUID(), // Temporary password
            user_metadata: {
                full_name: studentData.name,
                role: 'student'
            }
        }
    });

    if (functionError) {
        console.error("Error creating auth user for student:", functionError);
        throw new Error(functionError.message);
    }
    
    const user = functionData.user;
    if (!user) {
        throw new Error("Could not create auth user for student.");
    }

    try {
        const { data: countData, error: countError } = await supabase.rpc('get_student_count');
        if (countError) throw countError;
        const srn = `HCS${(countData + 1).toString().padStart(4, '0')}`;
        
        const finalStudentData = { 
            auth_uid: user.id,
            srn,
            name: studentData.name,
            date_of_birth: studentData.date_of_birth,
            gender: studentData.gender,
            blood_group: studentData.blood_group || null,
            religion: studentData.religion || null,
            category: studentData.category || null,
            father_name: studentData.father_name,
            father_phone: studentData.father_phone,
            father_email: studentData.father_email || null,
            mother_name: studentData.mother_name,
            mother_phone: studentData.mother_phone,
            mother_email: studentData.mother_email || null,
            guardian_name: studentData.guardian_name || null,
            guardian_relation: studentData.guardian_relation || null,
            permanent_address: studentData.permanent_address,
            current_address: studentData.current_address || null,
            class: studentData.class,
            section: studentData.section,
            admission_date: new Date(studentData.admission_date as string).toISOString(),
            previous_school: studentData.previous_school || null,
            transport_type: studentData.transport_type,
            private_vehicle_number: studentData.private_vehicle_number || null,
            school_transport_details: studentData.school_transport_details ? JSON.parse(studentData.school_transport_details as string) : null,
            // These fields are now managed by the class teacher
            email: studentData.email,
            student_phone: null,
            roll_number: null,
            emergency_contacts: [],
        };
        
        const { error: dbError } = await supabase.from(STUDENTS_COLLECTION).insert([finalStudentData]);

        if (dbError) {
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            throw new Error(`Failed to add student. Original error: ${dbError.message}`);
        }
       
    } catch (e: any) {
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
};
