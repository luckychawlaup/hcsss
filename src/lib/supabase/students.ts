
import { createClient } from "@/lib/supabase/client";
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
    date_of_birth: string; // YYYY-MM-DD
    aadhar_number?: string;
    aadhar_url?: string;
    opted_subjects?: string[];
    father_phone?: string;
    mother_phone?: string;
    student_phone?: string;
}

const uploadFileToSupabase = async (file: File, bucket: string, folder: string): Promise<string> => {
    const filePath = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!data.publicUrl) {
        throw new Error('Could not get public URL for uploaded file.');
    }
    return data.publicUrl;
};


export type CombinedStudent = (Student & { status: 'Registered' });

export const addStudent = async (studentData: any) => {
    const { data: countData, error: countError } = await supabase.rpc('get_student_count');
    if (countError) throw countError;
    const srn = `HCS${(countData + 1).toString().padStart(4, '0')}`;
    
    let photoUrl: string | undefined;
    if (studentData.photo) {
        photoUrl = await uploadFileToSupabase(studentData.photo, 'students', 'photos');
    }

    let aadharUrl: string | undefined;
    if (studentData.aadharCard) {
        aadharUrl = await uploadFileToSupabase(studentData.aadharCard, 'documents', 'students');
    }

    const finalStudentData = { 
        auth_uid: studentData.authUid,
        srn,
        name: studentData.name,
        email: studentData.email,
        photo_url: photoUrl,
        father_name: studentData.fatherName,
        mother_name: studentData.motherName,
        address: studentData.address,
        class: studentData.class,
        section: studentData.section,
        admission_date: studentData.admissionDate,
        date_of_birth: studentData.dateOfBirth,
        aadhar_number: studentData.aadharNumber,
        aadhar_url: aadharUrl,
        opted_subjects: studentData.optedSubjects,
        father_phone: studentData.fatherPhone,
        mother_phone: studentData.motherPhone,
        student_phone: studentData.studentPhone,
    };

    const { error } = await supabase.from(STUDENTS_COLLECTION).insert([finalStudentData]);

    if (error) {
        console.error("Error adding student:", error.message);
        throw new Error(`Failed to add student. Original error: ${error.message}`);
    }
};

export const getStudentsAndPending = (callback: (students: CombinedStudent[]) => void) => {
    const channel = supabase
        .channel('students-and-pending')
        .on('postgres_changes', { event: '*', schema: 'public', table: STUDENTS_COLLECTION }, async () => {
            const { data: students, error: studentsError } = await supabase.from(STUDENTS_COLLECTION).select('*');
            
            const combined: CombinedStudent[] = (students || []).map(s => ({ ...s, status: 'Registered' as const }));
            callback(combined);
        })
        .subscribe();
    
    (async () => {
        const { data: students, error: studentsError } = await supabase.from(STUDENTS_COLLECTION).select('*');
        const combined: CombinedStudent[] = (students || []).map(s => ({ ...s, status: 'Registered' as const }));
        callback(combined);
    })();

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

export const getStudentsForTeacher = (teacher: any, callback: (students: CombinedStudent[]) => void) => {
    if (!teacher) return () => {};

    const assignedClasses = new Set<string>();
    if(teacher.class_teacher_of) assignedClasses.add(teacher.class_teacher_of);
    if(teacher.classes_taught) teacher.classes_taught.forEach((c: string) => assignedClasses.add(c));
    const classList = Array.from(assignedClasses);

    if (classList.length === 0) {
        callback([]);
        return () => {};
    }

    const channel = supabase.channel(`students-for-teacher-${teacher.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: STUDENTS_COLLECTION }, async () => {
             const { data, error } = await supabase.from(STUDENTS_COLLECTION).select('*').in('class_section', classList);
             if(data) callback(data.map(s => ({...s, status: 'Registered'})));
        })
        .subscribe();
    
    (async () => {
        const { data, error } = await supabase.from(STUDENTS_COLLECTION).select('*').in('class_section', classList);
        if(data) callback(data.map(s => ({...s, status: 'Registered'})));
    })();

    return () => supabase.removeChannel(channel);
}

    