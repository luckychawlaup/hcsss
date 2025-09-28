
"use client";

import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";

const supabase = createClient();
const ATTENDANCE_TABLE = 'attendance';

export interface AttendanceRecord {
    id?: string;
    student_id: string;
    class_section: string;
    date: string; // YYYY-MM-DD
    status: 'present' | 'absent' | 'half-day' | 'holiday';
    marked_by: string; // Teacher's ID (UUID)
    created_at?: string;
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
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half-day', 'holiday')),
    marked_by UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT attendance_unique_student_date UNIQUE (student_id, date)
);

-- Create index for better performance
CREATE INDEX idx_attendance_class_date ON public.attendance(class_section, date);
CREATE INDEX idx_attendance_student_date ON public.attendance(student_id, date);

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
    (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = class_section AND
    marked_by = (SELECT id FROM public.teachers WHERE auth_uid = auth.uid())
);

-- Policy: Allow students to view their own attendance records
CREATE POLICY "Allow students to view their own attendance"
ON public.attendance FOR SELECT
USING (auth.uid() = (SELECT auth_uid FROM public.students WHERE id = student_id));

-- Policy: Allow Principal/Owner to view all attendance records
CREATE POLICY "Allow principal/owner to view all attendance"
ON public.attendance FOR SELECT
USING (auth.uid() IN ('6cc51c80-e098-4d6d-8450-5ff5931b7391', '946ba406-1ba6-49cf-ab78-f611d1350f33'));

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function
CREATE TRIGGER update_attendance_updated_at 
    BEFORE UPDATE ON public.attendance 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
`;

// Get attendance for a specific class on a specific date
export const getAttendanceForClass = async (classSection: string, date: Date): Promise<AttendanceRecord[]> => {
    try {
        const formattedDate = format(date, "yyyy-MM-dd");
        console.log(`[Attendance] Fetching attendance for class: ${classSection}, date: ${formattedDate}`);
        
        const { data, error } = await supabase
            .from(ATTENDANCE_TABLE)
            .select('*')
            .eq('class_section', classSection)
            .eq('date', formattedDate);
        
        if (error) {
            console.error(`[Attendance] Error fetching attendance:`, error);
            throw new Error(`Failed to fetch attendance: ${error.message}`);
        }
        
        console.log(`[Attendance] Fetched ${data?.length || 0} attendance records:`, data);
        return data || [];
    } catch (error) {
        console.error(`[Attendance] Unexpected error in getAttendanceForClass:`, error);
        throw error;
    }
};

// Set attendance for a class on a specific date
export const setAttendance = async (attendanceData: Omit<AttendanceRecord, 'id' | 'created_at'>[]): Promise<void> => {
    if (!attendanceData || attendanceData.length === 0) {
        throw new Error('No attendance data provided');
    }

    const { class_section, date, marked_by } = attendanceData[0];
    
    console.log(`[Attendance] Starting to save attendance:`, {
        class_section,
        date,
        marked_by,
        recordCount: attendanceData.length
    });
    
    try {
        console.log(`[Attendance] Attempting upsert...`);
        
        const { data, error: upsertError } = await supabase
            .from(ATTENDANCE_TABLE)
            .upsert(
                attendanceData,
                {
                    onConflict: 'student_id,date',
                    ignoreDuplicates: false
                }
            )
            .select();

        if (upsertError) {
            console.error(`[Attendance] Upsert failed:`, upsertError);
            throw new Error(`Failed to save attendance: ${upsertError.message}`);
        } else {
            console.log(`[Attendance] Successfully upserted ${data?.length || 0} attendance records.`);
        }
        
    } catch (error) {
        console.error(`[Attendance] Unexpected error in setAttendance:`, error);
        throw error;
    }
};


// Get attendance for a single student for a given month
export const getStudentAttendanceForMonth = async (studentId: string, month: Date): Promise<AttendanceRecord[]> => {
    try {
        const startDate = format(new Date(month.getFullYear(), month.getMonth(), 1), 'yyyy-MM-dd');
        const endDate = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');

        const { data, error } = await supabase
            .from(ATTENDANCE_TABLE)
            .select('*')
            .eq('student_id', studentId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) {
            console.error(`[Attendance] Error fetching student attendance:`, error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error(`[Attendance] Unexpected error in getStudentAttendanceForMonth:`, error);
        return [];
    }
};


// Get attendance for a single student for a given month with Real-Time
export const getStudentAttendanceForMonthRT = (
    studentId: string, 
    month: Date, 
    callback: (records: AttendanceRecord[]) => void
) => {
    const startDate = format(startOfMonth(month), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

    const fetchAndCallback = async () => {
        const records = await getStudentAttendanceForMonth(studentId, month);
        callback(records);
    };

    const channel = supabase
        .channel(`student-attendance-${studentId}-${format(month, 'yyyy-MM')}`)
        .on(
            'postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: ATTENDANCE_TABLE, 
                filter: `student_id=eq.${studentId}` 
            }, 
            (payload) => {
                console.log(`[RT Attendance] Payload received for student ${studentId}:`, payload);
                // Simple refetch on any change for this student
                fetchAndCallback();
            }
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[RT Attendance] Subscribed for student ${studentId}`);
                // Initial fetch after subscription is confirmed
                fetchAndCallback();
            }
            if (status === 'CHANNEL_ERROR') {
                console.error(`[RT Attendance] Subscription error for student ${studentId}:`, err);
            }
        });

    return channel;
};

// Get attendance statistics for a class
export const getAttendanceStats = async (classSection: string, startDate: Date, endDate: Date) => {
    try {
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        console.log(`[Attendance] Fetching stats for class: ${classSection}, period: ${formattedStartDate} to ${formattedEndDate}`);

        const { data, error } = await supabase
            .from(ATTENDANCE_TABLE)
            .select('status, date, student_id')
            .eq('class_section', classSection)
            .gte('date', formattedStartDate)
            .lte('date', formattedEndDate);

        if (error) {
            console.error(`[Attendance] Error fetching attendance stats:`, error);
            throw new Error(`Failed to fetch attendance stats: ${error.message}`);
        }

        // Calculate statistics
        const stats = {
            totalRecords: data?.length || 0,
            presentCount: data?.filter(record => record.status === 'present').length || 0,
            absentCount: data?.filter(record => record.status === 'absent').length || 0,
            halfDayCount: data?.filter(record => record.status === 'half-day').length || 0,
        };

        console.log(`[Attendance] Stats calculated:`, stats);
        return stats;
    } catch (error) {
        console.error(`[Attendance] Error in getAttendanceStats:`, error);
        throw error;
    }
};

    