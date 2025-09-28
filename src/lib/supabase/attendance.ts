
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
    status: 'present' | 'absent' | 'half-day';
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
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half-day')),
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
        // Try upsert first (if your table supports it)
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
            console.log(`[Attendance] Upsert failed, trying delete-insert approach:`, upsertError);
            
            // Fallback to delete-then-insert approach
            const { error: deleteError } = await supabase
                .from(ATTENDANCE_TABLE)
                .delete()
                .eq('class_section', class_section)
                .eq('date', date);

            if (deleteError) {
                console.error(`[Attendance] Error deleting existing records:`, deleteError);
                throw new Error(`Failed to clear existing attendance: ${deleteError.message}`);
            }

            console.log(`[Attendance] Existing records deleted, inserting new ones...`);

            const { data: insertData, error: insertError } = await supabase
                .from(ATTENDANCE_TABLE)
                .insert(attendanceData)
                .select();

            if (insertError) {
                console.error(`[Attendance] Error inserting new records:`, insertError);
                throw new Error(`Failed to insert attendance: ${insertError.message}`);
            }

            console.log(`[Attendance] Successfully inserted ${insertData?.length || 0} records using fallback method`);
        } else {
            console.log(`[Attendance] Successfully upserted ${data?.length || 0} attendance records:`, data);
        }
        
        // Verify the save by fetching the data back
        const verification = await supabase
            .from(ATTENDANCE_TABLE)
            .select('id, student_id, status')
            .eq('class_section', class_section)
            .eq('date', date);
            
        console.log(`[Attendance] Verification query result:`, verification.data);
        
    } catch (error) {
        console.error(`[Attendance] Unexpected error in setAttendance:`, error);
        throw error;
    }
};

// Alternative implementation using transaction-like approach
export const setAttendanceWithTransaction = async (attendanceData: Omit<AttendanceRecord, 'id' | 'created_at'>[]): Promise<void> => {
    if (!attendanceData || attendanceData.length === 0) {
        throw new Error('No attendance data provided');
    }

    const { class_section, date } = attendanceData[0];
    
    console.log(`[Attendance] Using transaction approach for class: ${class_section}, date: ${date}`);
    
    try {
        // First, delete existing records for the same class and date
        console.log(`[Attendance] Deleting existing records...`);
        const { error: deleteError } = await supabase
            .from(ATTENDANCE_TABLE)
            .delete()
            .eq('class_section', class_section)
            .eq('date', date);

        if (deleteError) {
            console.error(`[Attendance] Error deleting existing records:`, deleteError);
            throw new Error(`Failed to clear existing attendance: ${deleteError.message}`);
        }

        console.log(`[Attendance] Existing records deleted successfully`);

        // Then, insert new records
        console.log(`[Attendance] Inserting new records...`);
        const { data, error: insertError } = await supabase
            .from(ATTENDANCE_TABLE)
            .insert(attendanceData)
            .select();

        if (insertError) {
            console.error(`[Attendance] Error inserting new records:`, insertError);
            throw new Error(`Failed to insert attendance: ${insertError.message}`);
        }

        console.log(`[Attendance] Successfully inserted ${data?.length || 0} new records:`, data);
        
    } catch (error) {
        console.error(`[Attendance] Transaction failed:`, error);
        throw error;
    }
};

// Get attendance for a single student for a given month
export const getStudentAttendanceForMonth = async (studentId: string, month: Date): Promise<AttendanceRecord[]> => {
    try {
        const startDate = format(new Date(month.getFullYear(), month.getMonth(), 1), 'yyyy-MM-dd');
        const endDate = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');

        console.log(`[Attendance] Fetching student attendance for student: ${studentId}, month: ${startDate} to ${endDate}`);

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
        
        console.log(`[Attendance] Fetched ${data?.length || 0} records for student ${studentId}`);
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

  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select('*')
      .eq('student_id', studentId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching student attendance:', error);
      callback([]);
    } else {
      callback(data || []);
    }
  };

  const channel = supabase
    .channel(`student-attendance-${studentId}-${format(month, 'yyyy-MM')}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: ATTENDANCE_TABLE,
        filter: `student_id=eq.${studentId}`,
      },
      (payload) => {
        // Re-fetch all data for the month on any change
        fetchAttendance();
      }
    )
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await fetchAttendance();
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

// Utility function to validate attendance data before saving
export const validateAttendanceData = (attendanceData: Omit<AttendanceRecord, 'id' | 'created_at'>[]): string[] => {
    const errors: string[] = [];
    
    if (!attendanceData || attendanceData.length === 0) {
        errors.push('No attendance data provided');
        return errors;
    }
    
    attendanceData.forEach((record, index) => {
        if (!record.student_id) {
            errors.push(`Record ${index + 1}: Missing student_id`);
        }
        if (!record.class_section) {
            errors.push(`Record ${index + 1}: Missing class_section`);
        }
        if (!record.date) {
            errors.push(`Record ${index + 1}: Missing date`);
        }
        if (!record.status || !['present', 'absent', 'half-day'].includes(record.status)) {
            errors.push(`Record ${index + 1}: Invalid status`);
        }
        if (!record.marked_by) {
            errors.push(`Record ${index + 1}: Missing marked_by`);
        }
    });
    
    return errors;
};

// Debug function to check database connection and permissions
export const debugAttendanceAccess = async () => {
    try {
        console.log(`[Attendance Debug] Testing database access...`);
        
        // Test basic read access
        const { data: readTest, error: readError } = await supabase
            .from(ATTENDANCE_TABLE)
            .select('count')
            .limit(1);
            
        console.log(`[Attendance Debug] Read test:`, { data: readTest, error: readError });
        
        // Test current user info
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log(`[Attendance Debug] Current user:`, { user: user?.id, error: userError });
        
        // Test teacher info if user exists
        if (user) {
            const { data: teacherData, error: teacherError } = await supabase
                .from('teachers')
                .select('id, role, class_teacher_of')
                .eq('auth_uid', user.id)
                .single();
                
            console.log(`[Attendance Debug] Teacher data:`, { data: teacherData, error: teacherError });
        }
        
    } catch (error) {
        console.error(`[Attendance Debug] Error:`, error);
    }
};
