
'use server'

import { createClient } from "@/lib/supabase/client";
import { uploadImage, isImageKitInitialized } from "@/lib/imagekit";

const supabase = createClient();
const STUDENTS_COLLECTION = 'students';

export const addStudent = async (formData: FormData) => {
    const studentData = Object.fromEntries(formData.entries());
    const photo = formData.get('photo') as File;
    const aadharCard = formData.get('aadharCard') as File | null;

    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: studentData.email as string,
        password: Math.random().toString(36).slice(-8), // Temporary password
        options: {
            data: {
                full_name: studentData.name,
                role: 'student'
            },
            email_confirm: true, // Auto-confirm email
        }
    });

    if (authError) {
        console.error("Error creating auth user for student:", authError);
        throw authError;
    }
    
    const user = authData.user;
    if (!user) {
        throw new Error("Could not create auth user for student.");
    }

    try {
        if (!isImageKitInitialized()) {
            throw new Error("ImageKit is not configured. Please provide API keys in your .env file to enable image uploads.");
        }
        
        // 2. Generate SRN
        const { data: countData, error: countError } = await supabase.rpc('get_student_count');
        if (countError) throw countError;
        const srn = `HCS${(countData + 1).toString().padStart(4, '0')}`;
        
        // 3. Upload images to ImageKit
        const photoBuffer = Buffer.from(await photo.arrayBuffer());
        const photoUrl = await uploadImage(photoBuffer, photo.name, 'student_profiles');

        let aadharUrl: string | undefined;
        if (aadharCard && aadharCard.size > 0) {
            const aadharFileBuffer = Buffer.from(await aadharCard.arrayBuffer());
            aadharUrl = await uploadImage(aadharFileBuffer, aadharCard.name, 'student_documents');
        }
        
        const finalStudentData = { 
            name: studentData.name,
            email: studentData.email,
            father_name: studentData.father_name,
            mother_name: studentData.mother_name,
            address: studentData.address,
            class: studentData.class,
            section: studentData.section,
            admission_date: new Date(studentData.admission_date as string).toISOString(),
            date_of_birth: studentData.date_of_birth,
            opted_subjects: studentData.opted_subjects ? JSON.parse(studentData.opted_subjects as string) : [],
            father_phone: studentData.father_phone,
            mother_phone: studentData.mother_phone,
            student_phone: studentData.student_phone,
            aadhar_number: studentData.aadhar_number,
            auth_uid: user.id,
            srn,
            photo_url: photoUrl,
            aadhar_url: aadharUrl,
        };
        
        // 5. Insert student record into the database
        const { error: dbError } = await supabase.from(STUDENTS_COLLECTION).insert([finalStudentData]);

        if (dbError) {
            console.error("Error adding student to DB:", dbError.message);
            // If DB insert fails, delete the created auth user
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            throw new Error(`Failed to add student. Original error: ${dbError.message}`);
        }

        // 6. Send password reset email for initial password setup
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(studentData.email as string);
        if (resetError) {
            console.warn("Student created, but failed to send password reset email.", resetError);
        }

    } catch (e: any) {
        // Cleanup auth user if any step fails after its creation
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
};
