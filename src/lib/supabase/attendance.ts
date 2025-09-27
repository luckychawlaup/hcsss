
import { createClient } from "@/lib/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

const supabase = createClient();
const ATTENDANCE_COLLECTION = 'attendance';

export interface AttendanceRecord {
    id: string;
    student_id: string;
    class_section: string;
    date: string; // ISO String
    status: 'present' | 'absent' | 'half-day';
    marked_by: string; // Teacher's ID from 'teachers' table
    created_at: string;
}

// Upsert attendance records for a class on a specific date
export const setAttendance = async (records: Omit<AttendanceRecord, 'id' | 'created_at'>[]): Promise<void> => {
    if (!records || records.length === 0) {
        throw new Error("No attendance records provided");
    }

    const { error } = await supabase.from(ATTENDANCE_COLLECTION).upsert(records, {
        onConflict: 'student_id,date',
    });

    if (error) {
        console.error("Error setting attendance:", error);
        throw new Error(`Failed to save attendance: ${error.message}`);
    }
};

// Get attendance for a specific class on a specific date
export const getAttendanceForDate = async (classSection: string, date: string): Promise<AttendanceRecord[]> => {
    console.log(`Fetching attendance for class ${classSection} on date ${date}`);
    const { data, error } = await supabase
        .from(ATTENDANCE_COLLECTION)
        .select('*')
        .eq('class_section', classSection)
        .eq('date', format(new Date(date), "yyyy-MM-dd"));

    if (error) {
        console.error("Error fetching attendance for date:", error);
        return [];
    }
    
    console.log("Fetched attendance records:", data);
    return data || [];
};

// Get a student's attendance for a given month with real-time updates
export const getAttendanceForStudent = (studentId: string, month: Date, callback: (records: AttendanceRecord[]) => void) => {
    const fromDate = format(startOfMonth(month), 'yyyy-MM-dd');
    const toDate = format(endOfMonth(month), 'yyyy-MM-dd');

    const fetchAndCallback = async () => {
        const { data, error } = await supabase
            .from(ATTENDANCE_COLLECTION)
            .select('*')
            .eq('student_id', studentId)
            .gte('date', fromDate)
            .lte('date', toDate);

        if (error) {
            console.error("Error fetching student attendance:", error);
            callback([]);
            return;
        }
        callback(data || []);
    };
    
    // Initial fetch
    fetchAndCallback();

    // Real-time subscription
    const channel = supabase
        .channel(`student-attendance-${studentId}-${format(month, 'yyyy-MM')}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: ATTENDANCE_COLLECTION, 
            filter: `student_id=eq.${studentId}` 
        },
        (payload) => {
            fetchAndCallback(); // Refetch all for simplicity
        })
        .subscribe();
        
    return channel;
};
