
'use client'

import { createClient } from "@/lib/supabase/client";
import { addStudent as addStudentServerAction } from './students.server';

const supabase = createClient();
const STUDENTS_COLLECTION = 'students';

export const STUDENTS_TABLE_SETUP_SQL = `
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.promotion_history;


CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    srn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    date_of_birth TEXT NOT NULL,
    gender TEXT,
    blood_group TEXT,
    religion TEXT,
    category TEXT,
    house TEXT,
    father_name TEXT NOT NULL,
    father_phone TEXT,
    father_email TEXT,
    mother_name TEXT NOT NULL,
    mother_phone TEXT,
    mother_email TEXT,
    guardian_name TEXT,
    guardian_relation TEXT,
    student_phone TEXT,
    permanent_address TEXT NOT NULL,
    current_address TEXT,
    class TEXT NOT NULL,
    section TEXT NOT NULL,
    roll_number TEXT,
    admission_date TIMESTAMPTZ NOT NULL,
    previous_school TEXT,
    emergency_contacts TEXT[],
    transport_type TEXT,
    private_vehicle_number TEXT,
    school_transport_details JSONB,
    photo_url TEXT,
    aadhar_number TEXT,
    aadhar_url TEXT,
    opted_subjects TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.promotion_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_class TEXT NOT NULL,
    from_section TEXT NOT NULL,
    to_class TEXT NOT NULL,
    to_section TEXT NOT NULL,
    academic_year TEXT NOT NULL, -- e.g., "2023-2024"
    promoted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_history ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Allow principal/owner to manage student records" ON public.students;
CREATE POLICY "Allow principal/owner to manage student records"
ON public.students FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527')
);

DROP POLICY IF EXISTS "Allow teachers to manage their students records" ON public.students;
CREATE POLICY "Allow teachers to manage their students records"
ON public.students FOR ALL
USING (
    (
        (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = (class || '-' || section)
    )
    OR
    (
      (class || '-' || section) IN (SELECT unnest(classes_taught) FROM public.teachers WHERE auth_uid = auth.uid())
    )
);


DROP POLICY IF EXISTS "Allow students to view their own profile" ON public.students;
CREATE POLICY "Allow students to view their own profile"
ON public.students FOR SELECT
USING (auth_uid = auth.uid());

-- Policies for promotion_history
CREATE POLICY "Allow admins to manage promotion history"
ON public.promotion_history FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527')
);

CREATE POLICY "Allow users to view their own promotion history"
ON public.promotion_history FOR SELECT
USING (
    (SELECT id FROM public.students WHERE auth_uid = auth.uid()) = student_id
);
`;


export interface Student {
    id: string;
    auth_uid: string;
    srn: string;
    name: string;
    email: string;
    photo_url?: string;
    date_of_birth: string;
    gender?: 'Male' | 'Female' | 'Other';
    blood_group?: string;
    religion?: string;
    category?: 'General' | 'OBC' | 'SC' | 'ST' | 'Other';
    house?: 'Red' | 'Green' | 'Blue' | 'Yellow';
    
    father_name: string;
    father_phone?: string;
    father_email?: string;
    mother_name: string;
    mother_phone?: string;
    mother_email?: string;

    guardian_name?: string;
    guardian_relation?: string;
    student_phone?: string;

    permanent_address: string;
    current_address?: string;
    
    class: string;
    section: string;
    roll_number?: string;
    admission_date: string;
    previous_school?: string;

    emergency_contacts?: string[];
    transport_type?: 'Own Vehicle' | 'Pedestrian' | 'School Transport';
    private_vehicle_number?: string;
    school_transport_details?: {
        driver_name?: string;
        driver_phone?: string;
        bus_number?: string;
    };
    
    aadhar_number?: string;
    aadhar_url?: string;
    opted_subjects?: string[];
}

export type CombinedStudent = (Student & { status: 'Registered' });

// This function is now a wrapper around the server action.
export const addStudent = async (studentData: Omit<Student, 'id' | 'auth_uid' | 'srn'>) => {
    const formData = new FormData();
    Object.entries(studentData).forEach(([key, value]) => {
        if (value instanceof Date) {
            formData.append(key, value.toISOString());
        } else if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
        }
    });
    
    return addStudentServerAction(formData);
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
    const { data, error } = await supabase.from(STUDENTS_COLLECTION).select('*').eq('auth_uid', authUid).maybeSingle();
    if (error) {
        console.error("Error fetching student by auth ID:", error);
    }
    return data;
}

export const getStudentByEmail = async (email: string): Promise<Student | null> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error fetching student by email:', error);
  }
  
  return data;
};

export const updateStudent = async (id: string, updates: Partial<any>) => {
    const { error } = await supabase.from(STUDENTS_COLLECTION).update(updates).eq('id', id);
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

export const getStudentsForTeacher = (teacher: any | null, callback: (students: CombinedStudent[]) => void) => {
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


export const promoteStudents = async ({
    studentIds,
    fromClass,
    toClass,
    academicYear,
}: {
    studentIds: string[];
    fromClass: { class: string; section: string };
    toClass: { class: string; section: string };
    academicYear: string;
}): Promise<void> => {
    if (!studentIds || studentIds.length === 0) {
        throw new Error("No students selected for promotion.");
    }

    // 1. Update the student records
    const { error: updateError } = await supabase
        .from('students')
        .update({
            class: toClass.class,
            section: toClass.section,
            roll_number: null, // Reset roll number for the new class
        })
        .in('id', studentIds);

    if (updateError) {
        console.error("Error updating student records:", updateError);
        throw new Error(`Failed to promote students: ${updateError.message}`);
    }

    // 2. Create records in the promotion history table
    const historyRecords = studentIds.map(studentId => ({
        student_id: studentId,
        from_class: fromClass.class,
        from_section: fromClass.section,
        to_class: toClass.class,
        to_section: toClass.section,
        academic_year: academicYear,
    }));

    const { error: historyError } = await supabase.from('promotion_history').insert(historyRecords);

    if (historyError) {
        // This is a tricky situation. The promotion happened, but the history wasn't logged.
        // For now, we'll log the error but not fail the whole operation.
        console.error("CRITICAL: Students were promoted, but failed to log promotion history:", historyError);
    }
};
