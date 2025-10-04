'use server'

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

const TEACHERS_COLLECTION = 'teachers';

const generateEmployeeId = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Helper function to clean FormData values
const cleanValue = (value: any): any => {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
    }
    return value;
}

export const addTeacher = async (formData: FormData) => {
    const supabase = createClient();
    const teacherData = Object.fromEntries(formData.entries());

    try {
        // Validate required fields before creating auth user
        const requiredFields = ['name', 'email', 'dob', 'father_name', 'mother_name', 'phone_number', 'address', 'role', 'subject', 'joining_date'];
        const missingFields = requiredFields.filter(field => !cleanValue(teacherData[field]));
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(teacherData.email as string)) {
            throw new Error('Invalid email format');
        }

        // Call Edge function to create user without a password
        const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
            body: {
                email: (teacherData.email as string).toLowerCase().trim(),
                user_metadata: {
                    full_name: teacherData.name,
                    role: 'teacher',
                    avatar_url: cleanValue(teacherData.photo_url)
                }
            }
        });

        if (functionError) {
            console.error("Error creating auth user for teacher:", functionError);
            throw new Error(`Failed to create auth user: ${functionError.message}`);
        }

        const user = functionData?.user;
        if (!user || !user.id) {
            throw new Error("Could not create user for teacher - no user ID returned");
        }

        const employee_id = generateEmployeeId(10);
        
        // Correctly parse array and json fields from FormData
        let qualifications = [];
        let classes_taught = [];
        let bank_account = null;

        try {
            qualifications = teacherData.qualifications ? JSON.parse(teacherData.qualifications as string) : [];
            if (!Array.isArray(qualifications)) qualifications = [];
        } catch (e) {
            console.warn('Failed to parse qualifications:', e);
            qualifications = [];
        }

        try {
            classes_taught = teacherData.classes_taught ? JSON.parse(teacherData.classes_taught as string) : [];
            if (!Array.isArray(classes_taught)) classes_taught = [];
        } catch (e) {
            console.warn('Failed to parse classes_taught:', e);
            classes_taught = [];
        }

        try {
            if (teacherData.bank_account) {
                const parsed = JSON.parse(teacherData.bank_account as string);
                // Only include bank_account if it has actual values
                const hasValues = Object.values(parsed).some(v => v !== null && v !== undefined && v !== '');
                bank_account = hasValues ? parsed : null;
            }
        } catch (e) {
            console.warn('Failed to parse bank_account:', e);
            bank_account = null;
        }
        
        // Format the joining_date to match the TEXT column type 'dd/MM/yyyy'
        let formattedJoiningDate;
        try {
            const joiningDate = new Date(teacherData.joining_date as string);
            if (isNaN(joiningDate.getTime())) {
                throw new Error('Invalid joining date');
            }
            formattedJoiningDate = format(joiningDate, 'dd/MM/yyyy');
        } catch (e) {
            throw new Error('Invalid joining_date format. Please provide a valid date.');
        }

        // Build finalTeacherData with only the core required fields first
        const finalTeacherData: any = {
            employee_id: employee_id,
            auth_uid: user.id,
            name: cleanValue(teacherData.name),
            email: (teacherData.email as string).toLowerCase().trim(),
            dob: cleanValue(teacherData.dob),
            father_name: cleanValue(teacherData.father_name),
            mother_name: cleanValue(teacherData.mother_name),
            phone_number: cleanValue(teacherData.phone_number),
            address: cleanValue(teacherData.address),
            role: cleanValue(teacherData.role),
            subject: cleanValue(teacherData.subject),
            joining_date: formattedJoiningDate,
        };

        // Add optional fields only if they have values
        if (cleanValue(teacherData.photo_url)) {
            finalTeacherData.photo_url = cleanValue(teacherData.photo_url);
        }
        if (cleanValue(teacherData.gender)) {
            finalTeacherData.gender = cleanValue(teacherData.gender);
        }
        if (qualifications.length > 0) {
            finalTeacherData.qualifications = qualifications;
        }
        if (cleanValue(teacherData.class_teacher_of)) {
            finalTeacherData.class_teacher_of = cleanValue(teacherData.class_teacher_of);
        }
        if (classes_taught.length > 0) {
            finalTeacherData.classes_taught = classes_taught;
        }
        if (cleanValue(teacherData.work_experience)) {
            finalTeacherData.work_experience = cleanValue(teacherData.work_experience);
        }
        if (bank_account) {
            finalTeacherData.bank_account = bank_account;
        }

        // Log the data being inserted for debugging
        console.log('Inserting teacher data:', JSON.stringify(finalTeacherData, null, 2));

        const { data: insertedData, error: dbError } = await supabase
            .from(TEACHERS_COLLECTION)
            .insert([finalTeacherData])
            .select();

        if (dbError) {
            console.error('Database insert error:', JSON.stringify(dbError, null, 2));
            console.error('Error code:', dbError.code);
            console.error('Error message:', dbError.message);
            console.error('Error details:', dbError.details);
            console.error('Error hint:', dbError.hint);
            
            // Delete the auth user that was just created
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            
            throw new Error(`Database error: ${dbError.message || 'Failed to insert teacher'}`);
        }

        console.log('Teacher added successfully:', insertedData);
        return { success: true, data: insertedData };

    } catch (e: any) {
        console.error('Error in addTeacher:', e);
        
        // If user was created, try to delete it
        if (e.user?.id) {
            try {
                await supabase.functions.invoke('delete-user', { body: { uid: e.user.id } });
            } catch (deleteError) {
                console.error('Failed to cleanup auth user:', deleteError);
            }
        }
        
        throw new Error(e.message || 'Failed to add teacher');
    }
};