
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

export type CombinedStudent = (Student & { status: 'Registered' });

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

export const updateStudent = async (id: string, updates: Partial<Student>) => {
    const { error } = await supabase.from(STUDENTS_COLLECTION).update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteStudent = async (studentId: string) => {
    const { error } = await supabase.from(STUDENTS_COLLECTION).delete().eq('id', studentId);
    if(error) throw error;
};

export const getStudentsForTeacher = (teacher: any, callback: (students: CombinedStudent[]) => void) => {
    const assignedClasses = new Set<string>();
    if(teacher.class_teacher_of) assignedClasses.add(teacher.class_teacher_of);
    if(teacher.classes_taught) teacher.classes_taught.forEach((c: string) => assignedClasses.add(c));
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
