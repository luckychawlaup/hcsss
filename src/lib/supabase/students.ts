
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

const STUDENTS_COLLECTION = 'students';
const PENDING_STUDENTS_COLLECTION = 'pending_students';


export interface Student {
    id: string;
    authUid: string;
    srn: string;
    name: string;
    email: string;
    photoUrl?: string;
    fatherName: string;
    motherName: string;
    address: string;
    class: string;
    section: string;
    admissionDate: number;
    dateOfBirth: string; // YYYY-MM-DD
    aadharNumber?: string;
    aadharUrl?: string;
    optedSubjects?: string[];
    fatherPhone?: string;
    motherPhone?: string;
    studentPhone?: string;
}

export interface PendingStudent {
    id: string;
    name: string;
    email: string;
    class: string;
    section: string;
    admissionDate: number;
    dateOfBirth: string;
    fatherName: string;
    motherName: string;
    address: string;
    registrationKey: string;
}

export type CombinedStudent = (Student & { status: 'Registered' }) | (PendingStudent & { status: 'Pending' });

export const addStudent = async (studentData: Omit<Student, 'id' | 'srn'>) => {
    const { data: countData, error: countError } = await supabase.rpc('get_student_count');
    if (countError) throw countError;
    const srn = `HCS${(countData + 1).toString().padStart(4, '0')}`;
    
    const finalStudentData = { ...studentData, srn };

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
            const { data: pending, error: pendingError } = await supabase.from(PENDING_STUDENTS_COLLECTION).select('*');

            const combined: CombinedStudent[] = [
                ...(students || []).map(s => ({ ...s, status: 'Registered' as const })),
                ...(pending || []).map(p => ({ ...p, status: 'Pending' as const })),
            ];
            callback(combined);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: PENDING_STUDENTS_COLLECTION }, async () => {
            const { data: students, error: studentsError } = await supabase.from(STUDENTS_COLLECTION).select('*');
            const { data: pending, error: pendingError } = await supabase.from(PENDING_STUDENTS_COLLECTION).select('*');

            const combined: CombinedStudent[] = [
                ...(students || []).map(s => ({ ...s, status: 'Registered' as const })),
                ...(pending || []).map(p => ({ ...p, status: 'Pending' as const })),
            ];
            callback(combined);
        })
        .subscribe();
    
    (async () => {
        const { data: students, error: studentsError } = await supabase.from(STUDENTS_COLLECTION).select('*');
        const { data: pending, error: pendingError } = await supabase.from(PENDING_STUDENTS_COLLECTION).select('*');
        const combined: CombinedStudent[] = [
            ...(students || []).map(s => ({ ...s, status: 'Registered' as const })),
            ...(pending || []).map(p => ({ ...p, status: 'Pending' as const })),
        ];
        callback(combined);
    })();

    return () => supabase.removeChannel(channel);
}

export const getStudentByAuthId = async (authUid: string): Promise<Student | null> => {
    const { data, error } = await supabase.from(STUDENTS_COLLECTION).select('*').eq('authUid', authUid).single();
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

export const updateStudent = async (id: string, updates: Partial<Student>) => {
    const { error } = await supabase.from(STUDENTS_COLLECTION).update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteStudent = async (studentId: string) => {
    // First, get the student's auth_uid to delete their auth account later
    const { data: student, error: fetchError } = await supabase.from(STUDENTS_COLLECTION).select('authUid, email').eq('id', studentId).single();

    if(fetchError || !student) {
        console.error("Could not fetch student to delete:", fetchError);
        // Handle case where it's a pending student
        const { error: pendingDeleteError } = await supabase.from(PENDING_STUDENTS_COLLECTION).delete().eq('id', studentId);
        if(pendingDeleteError) throw pendingDeleteError;
        return;
    }

    const { error } = await supabase.from(STUDENTS_COLLECTION).delete().eq('id', studentId);
    if(error) throw error;
    
    // This needs to be done via a server-side function for security
    // console.log(`TODO: Implement server-side function to delete auth user: ${student.authUid}`);
};

export const getStudentsForTeacher = (teacher: Teacher, callback: (students: CombinedStudent[]) => void) => {
    const assignedClasses = new Set<string>();
    if(teacher.classTeacherOf) assignedClasses.add(teacher.classTeacherOf);
    if(teacher.classesTaught) teacher.classesTaught.forEach(c => assignedClasses.add(c));
    const classList = Array.from(assignedClasses);

    const channel = supabase.channel(`students-for-teacher-${teacher.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: STUDENTS_COLLECTION }, async () => {
             const { data, error } = await supabase.from(STUDENTS_COLLECTION).select('*').in('class', classList.map(c => c.split('-')[0])).in('section', classList.map(c => c.split('-')[1]));
             if(data) callback(data.map(s => ({...s, status: 'Registered'})));
        })
        .subscribe();
    
    (async () => {
        const { data, error } = await supabase.from(STUDENTS_COLLECTION).select('*').in('class', classList.map(c => c.split('-')[0])).in('section', classList.map(c => c.split('-')[1]));
        if(data) callback(data.map(s => ({...s, status: 'Registered'})));
    })();

    return () => supabase.removeChannel(channel);
}

export const regenerateStudentKey = async (pendingStudentId: string): Promise<string> => {
    const newKey = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from(PENDING_STUDENTS_COLLECTION).update({ registrationKey: newKey }).eq('id', pendingStudentId);
    if(error) throw error;
    return newKey;
}
