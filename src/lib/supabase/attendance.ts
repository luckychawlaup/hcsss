
"use client";

import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

const supabase = createClient();
const ATTENDANCE_TABLE = 'attendance';

export interface AttendanceRecord {
    id?: string;
    student_id: string;
    class_section: string;
    date: string; // YYYY-MM-DD
    status: 'present' | 'absent' | 'half-day';
    marked_by: string; // Teacher's auth_uid
}

export const ATTENDANCE_TABLE_SETUP_SQL = `
-- Creates the attendance table and sets up RLS policies.
-- This allows class teachers to manage attendance for their specific class.
DROP TABLE IF EXISTS public.attendance;

CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_section TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half-day')),
    marked_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT attendance_unique_student_date UNIQUE (student_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow teachers to manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow students to view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow principal/owner to view all attendance" ON public.attendance;

-- Policy: Allow Class Teachers to manage attendance for their assigned class
CREATE POLICY "Allow teachers to manage attendance"
ON public.attendance FOR ALL
USING (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher' AND
    (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = class_section
)
WITH CHECK (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher' AND
    (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = class_section
);

-- Policy: Allow students to view their own attendance records
CREATE POLICY "Allow students to view their own attendance"
ON public.attendance FOR SELECT
USING (auth.uid() = (SELECT auth_uid FROM public.students WHERE id = student_id));

-- Policy: Allow Principal/Owner to view all attendance records
CREATE POLICY "Allow principal/owner to view all attendance"
ON public.attendance FOR SELECT
USING (auth.uid() IN ('6cc51c80-e098-4d6d-8450-5ff5931b7391', '946ba406-1ba6-49cf-ab78-f611d1350f33'));
`;

// Get attendance for a specific class on a specific date
export const getAttendanceForClass = async (classSection: string, date: Date): Promise<AttendanceRecord[]> => {
    const formattedDate = format(date, "yyyy-MM-dd");
    console.log(`Fetching attendance for class ${classSection} on date ${formattedDate}`);
    
    const { data, error } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*')
        .eq('class_section', classSection)
        .eq('date', formattedDate);
    
    if (error) {
        console.error("Error fetching attendance:", error);
        throw error;
    }
    
    console.log('Fetched attendance records:', data);
    return data || [];
};

// Set attendance for a class on a specific date
export const setAttendance = async (attendanceData: Omit<AttendanceRecord, 'id'>[]) => {
    if (attendanceData.length === 0) return;

    // Use a delete-then-insert strategy to ensure consistency
    const { class_section, date } = attendanceData[0];
    
    const { error: deleteError } = await supabase
        .from(ATTENDANCE_TABLE)
        .delete()
        .eq('class_section', class_section)
        .eq('date', date);

    if (deleteError) {
        console.error("Error clearing existing attendance:", deleteError);
        throw deleteError;
    }

    const { error: insertError } = await supabase
        .from(ATTENDANCE_TABLE)
        .insert(attendanceData);

    if (insertError) {
        console.error("Error inserting new attendance:", insertError);
        throw insertError;
    }
};

// Get attendance for a single student for a given month
export const getStudentAttendanceForMonth = async (studentId: string, month: Date): Promise<AttendanceRecord[]> => {
    const startDate = format(new Date(month.getFullYear(), month.getMonth(), 1), 'yyyy-MM-dd');
    const endDate = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');

    const { data, error } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) {
        console.error("Error fetching student attendance for month:", error);
        return [];
    }
    return data || [];
};
