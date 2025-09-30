
'use client'

import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/imagekit";

const supabase = createClient();
const STUDENTS_COLLECTION = 'students';

export interface Student {
    id: string;
    auth_uid: string;
    srn: string;
    name: string;
    email: string;
    photo_url?: string;
    father_name: string;
    mother_name: string;
    address: string;
    class: string;
    section: string;
    admission_date: number;
    date_of_birth: string; // DD/MM/YYYY
    aadhar_number?: string;
    aadhar_url?: string;
    opted_subjects?: string[];
    father_phone?: string;
    mother_phone?: string;
    student_phone?: string;
}

export type CombinedStudent = (Student & { status: 'Registered' });

export const addStudent = async (studentData: Omit<Student, 'id' | 'auth_uid' | 'srn' | 'photo_url' | 'aadhar_url'> & { photo: File, aadharCard?: File}) => {
    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: studentData.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        options: {
            data: {
                full_name: studentData.name,
                role: 'student'
            }
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
        // 2. Generate SRN
        const { data: countData, error: countError } = await supabase.rpc('get_student_count');
        if (countError) throw countError;
        const srn = `HCS${(countData + 1).toString().padStart(4, '0')}`;
        
        // 3. Upload images to ImageKit
        const fileBuffer = Buffer.from(await studentData.photo.arrayBuffer());
        const photoUrl = await uploadImage(fileBuffer, studentData.photo.name, 'student_profiles');

        let aadharUrl: string | undefined;
        if (studentData.aadharCard) {
            const aadharFileBuffer = Buffer.from(await studentData.aadharCard.arrayBuffer());
            aadharUrl = await uploadImage(aadharFileBuffer, studentData.aadharCard.name, 'student_documents');
        }

        // 4. Prepare data for DB insert
        const { photo, aadharCard, ...restOfStudentData } = studentData;
        const finalStudentData = { 
            ...restOfStudentData,
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
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(studentData.email);
        if (resetError) {
            console.warn("Student created, but failed to send password reset email.", resetError);
        }

    } catch (e: any) {
        // Cleanup auth user if any step fails after its creation
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
};

export const getStudentsAndPending = (callback: (students: CombinedStudent[]) => void) => {
    const fetchAndCallback = async () => {
        const { data: students, error: studentsError } = await supabase.from(STUDENTS_COLLECTION).select('*');
        const combined: CombinedStudent[] = (students || []).map(s => ({ ...s, status: 'Registered' as const }));
        callback(combined);
    };

    const channel = supabase
        .channel('all-students')
        .on('postgres_changes', { event: '*', schema: 'public', table: STUDENTS_COLLECTION }, fetchAndCallback)
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
             if (err) {
                console.error(`Real-time channel error in all-students:`, err);
            }
        });
    
    return () => supabase.removeChannel(channel);
}

export const getStudentByAuthId = async (authUid: string): Promise<Student | null> => {
    const { data, error } = await supabase.from(STUDENTS_COLLECTION).select('*').eq('auth_uid', authUid).single();
    if (error) {
        if (error.code !== 'PGRST116') { // Ignore "No rows found"
             console.error("Error fetching student by auth ID:", error);
        }
        return null;
    }
    return data;
}

export const getStudentByEmail = async (email: string): Promise<Student | null> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching student by email:', error);
  }
  
  return data;
};

export const updateStudent = async (id: string, updates: Partial<any>) => {
    const dbUpdates = {
        name: updates.name,
        father_name: updates.fatherName,
        mother_name: updates.motherName,
        address: updates.address,
        class: updates.class,
        section: updates.section,
        date_of_birth: updates.dateOfBirth,
        father_phone: updates.fatherPhone,
        mother_phone: updates.motherPhone,
        student_phone: updates.studentPhone,
    };
    const { error } = await supabase.from(STUDENTS_COLLECTION).update(dbUpdates).eq('id', id);
    if (error) throw error;
};

export const deleteStudent = async (studentId: string) => {
    const { data: student, error: fetchError } = await supabase.from(STUDENTS_COLLECTION).select('auth_uid').eq('id', studentId).single();
    if (fetchError) {
        console.error("Error fetching student for deletion:", fetchError);
        throw fetchError;
    }
    
    const { error } = await supabase.from(STUDENTS_COLLECTION).delete().eq('id', studentId);
    if(error) throw error;
    
    // Call edge function to delete auth user
    if (student.auth_uid) {
        const { error: funcError } = await supabase.functions.invoke('delete-user', {
            body: { uid: student.auth_uid },
        });
        if (funcError) {
            console.error("DB record deleted, but failed to delete auth user:", funcError);
            throw new Error("DB record deleted, but failed to delete auth user.");
        }
    }
};

export const getStudentsForTeacher = (teacher: Teacher | null, callback: (students: CombinedStudent[]) => void) => {
    if (!teacher) {
        callback([]);
        return () => {};
    }

    const assignedClasses = new Set<string>();
    if(teacher.class_teacher_of) assignedClasses.add(teacher.class_teacher_of);
    if(teacher.classes_taught) teacher.classes_taught.forEach((c: string) => assignedClasses.add(c));
    
    const classList = Array.from(assignedClasses);

    if (classList.length === 0) {
        callback([]);
        return () => {};
    }

    const fetchAndFilterStudents = async () => {
        const { data, error } = await supabase.from(STUDENTS_COLLECTION)
            .select('*')
            .in('class', classList.map(c => c.split('-')[0]))
            .in('section', classList.map(c => c.split('-')[1]));
            
        if (error) {
            console.error("Error fetching students for teacher:", error);
            callback([]);
            return;
        }
        if (data) {
            const filteredStudents = data.filter(student => 
                classList.includes(`${student.class}-${student.section}`)
            );
            callback(filteredStudents.map(s => ({...s, status: 'Registered'})));
        }
    }

    const channel = supabase.channel(`students-teacher-${teacher.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: STUDENTS_COLLECTION }, (payload) => {
             fetchAndFilterStudents();
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                 fetchAndFilterStudents();
            }
             if (err) {
                console.error(`Real-time channel error in students-teacher-${teacher.id}:`, err);
            }
        });

    return () => supabase.removeChannel(channel);
}
