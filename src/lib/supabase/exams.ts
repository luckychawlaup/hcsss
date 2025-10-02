import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const EXAMS_COLLECTION = 'exams';

export interface Exam {
    id: string;
    name: string;
    date: string;
    start_date?: string;
    end_date?: string;
    created_at?: string;
}

// Database setup SQL - you'll need to run this in your Supabase SQL editor
export const SETUP_SQL = `
-- This script will drop and recreate your exams table to ensure it is correct.
-- WARNING: This will delete any existing data in the 'exams' table.

-- Drop tables in the correct order to avoid dependency issues
DROP TABLE IF EXISTS public.marks;
DROP TABLE IF EXISTS public.exams;

-- Create the 'exams' table first
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Policies for 'exams' table
CREATE POLICY "Allow admins to manage all exams"
ON public.exams FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '8ca56ec5-5e29-444f-931a-7247d65da329') -- Owner UID
);

CREATE POLICY "Allow class teachers to manage exams"
ON public.exams FOR ALL
USING ((SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher');

CREATE POLICY "Allow authenticated users to read exams"
ON public.exams FOR SELECT
USING (auth.role() = 'authenticated');


-- Now create the 'marks' table with the foreign key to exams
CREATE TABLE public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    marks INTEGER NOT NULL DEFAULT 0,
    max_marks INTEGER NOT NULL DEFAULT 100,
    grade TEXT,
    exam_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT marks_unique_student_exam_subject UNIQUE (student_id, exam_id, subject)
);

-- Enable RLS for marks
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Policies for 'marks' table
CREATE POLICY "Allow class teachers & principal to manage marks"
ON public.marks FOR ALL
USING (
    (
        (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = 
        (SELECT class || '-' || section FROM public.students WHERE id = public.marks.student_id)
    )
    OR
    (
        (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) = 'principal'
    )
     OR
    (
        auth.uid() = '8ca56ec5-5e29-444f-931a-7247d65da329'
    )
);

CREATE POLICY "Allow students to view their own marks"
ON public.marks FOR SELECT
USING (
  student_id = (SELECT id FROM public.students WHERE auth_uid = auth.uid())
);
`;

// Helper function to check if tables exist
export const checkTablesExist = async (): Promise<{
    exams: boolean;
}> => {
    const results = {
        exams: false,
    };

    try {
        const { error } = await supabase
            .from('exams')
            .select('*')
            .limit(0);
        
        results.exams = !error;
        
        if (error) {
            console.log(`Table 'exams' check result:`, {
                exists: false,
                code: error.code,
                message: error.message
            });
        } else {
            console.log(`✅ Table 'exams' exists`);
        }
    } catch (e) {
        console.log(`❌ Table 'exams' does not exist or is inaccessible`);
    }

    return results;
};

// Setup instructions for the user
export const showSetupInstructions = () => {
    console.log(`
🔧 SUPABASE SETUP REQUIRED 🔧

Your Supabase database table for exams has a permission issue. Please follow these steps to fix it:

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a new query and paste the following SQL:

${SETUP_SQL}

4. Click "Run" to execute the SQL
5. Refresh your application

Alternatively, you can copy the SQL from the browser console where it's logged separately.
    `);
};

export const getExams = (callback: (exams: Exam[]) => void) => {
    const channel = supabase
        .channel('exams-channel')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: EXAMS_COLLECTION 
        }, (payload) => {
            fetchAndCallbackExams(callback);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                fetchAndCallbackExams(callback);
            }
        });
    
    return channel;
};

const fetchAndCallbackExams = async (callback: (exams: Exam[]) => void) => {
    try {
        const { data, error } = await supabase.from(EXAMS_COLLECTION).select('*');
        
        if (error) {
            if (error.code === '42P01') { // relation does not exist
                console.error("❌ Exams table doesn't exist. Please run the setup SQL first.");
                showSetupInstructions();
            } else {
                console.error("Error fetching exams:", error);
            }
            return;
        }
        
        if (data) {
            callback(data);
        }
    } catch (e) {
        console.error("Unexpected error fetching exams:", e);
    }
};

export const prepopulateExams = async (): Promise<boolean> => {
    try {
        console.log("🚀 Starting exam prepopulation process...");
        
        const tablesStatus = await checkTablesExist();
        
        if (!tablesStatus.exams) {
            console.error("❌ Exams table doesn't exist!");
            console.log("📋 Setup SQL (copy and run in Supabase SQL Editor):");
            console.log(SETUP_SQL);
            showSetupInstructions();
            return false;
        }
        
        const { data: existingExams, error: fetchError } = await supabase
            .from(EXAMS_COLLECTION)
            .select('id')
            .limit(1);

        if (fetchError) {
            console.error("Error checking existing exams:", fetchError);
            return false;
        }

        if (existingExams && existingExams.length > 0) {
            console.log("✅ Exams table contains data, skipping prepopulation.");
            return true;
        }
        
        console.log("✅ Exams table is empty. No default exams to add.");
        return true;
        
    } catch (e) {
        console.error("❌ Unexpected error during exam prepopulation:", e);
        return false;
    }
};

// CRUD operations
export const addExam = async (exam: Omit<Exam, 'id' | 'created_at'>): Promise<Exam | null> => {
    try {
        console.log("🚀 Attempting to add exam:", exam);
        
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
            console.error("❌ Authentication error:", authError);
            throw new Error(`Authentication failed: ${authError.message}`);
        }
        
        if (!user) {
            console.error("❌ User not authenticated");
            throw new Error("User must be logged in to add exams");
        }
        
        console.log("✅ User authenticated:", user.id);
        
        // Validate exam data
        if (!exam.name || exam.name.trim().length < 3) {
            throw new Error("Exam name must be at least 3 characters long");
        }
        
        if (!exam.date) {
            throw new Error("Exam date is required");
        }
        
        // Try to insert the exam
        const { data, error } = await supabase
            .from(EXAMS_COLLECTION)
            .insert([{
                name: exam.name.trim(),
                date: exam.date,
                start_date: exam.start_date,
                end_date: exam.end_date,
            }])
            .select()
            .single();
        
        if (error) {
            console.error("❌ Supabase error details:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            
            // Handle specific error codes
            if (error.code === '42501') {
                throw new Error("Permission denied. Please check your database policies.");
            } else if (error.code === '42P01') {
                throw new Error("Exams table doesn't exist. Please run the setup SQL first.");
            } else if (error.code === '23505') {
                throw new Error("An exam with this name already exists.");
            } else {
                throw new Error(`Database error: ${error.message || 'Unknown error'}`);
            }
        }
        
        if (!data) {
            throw new Error("No data returned from database after insert");
        }
        
        console.log("✅ Exam added successfully:", data);
        return data;
        
    } catch (e: any) {
        console.error("❌ Error in addExam:", e);
        
        // Re-throw with more context if it's our custom error
        if (e.message && e.message.includes('Authentication failed')) {
            throw e;
        }
        if (e.message && e.message.includes('Permission denied')) {
            throw e;
        }
        if (e.message && e.message.includes('Database error')) {
            throw e;
        }
        
        // For unexpected errors, provide a generic message
        throw new Error(`Failed to add exam: ${e.message || 'Unknown error occurred'}`);
    }
};

export const updateExam = async (id: string, updates: Partial<Omit<Exam, 'id' | 'created_at'>>): Promise<Exam | null> => {
    try {
        const { data, error } = await supabase
            .from(EXAMS_COLLECTION)
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error("Error updating exam:", error);
            throw error;
        }
        
        return data;
    } catch (e) {
        console.error("Unexpected error updating exam:", e);
        throw e;
    }
};

export const deleteExam = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from(EXAMS_COLLECTION)
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error("Error deleting exam:", error);
            throw error;
        }
        
        return true;
    } catch (e) {
        console.error("Unexpected error deleting exam:", e);
        throw e;
    }
};

export const unsubscribeExams = (channel: any) => {
    if (channel) {
        supabase.removeChannel(channel);
    }
};

// Initialize all tables (call this once when your app starts)
export const initializeDatabase = async (): Promise<boolean> => {
    console.log("🔄 Checking database initialization...");
    
    const tablesStatus = await checkTablesExist();
    
    if (!tablesStatus.exams) {
        console.error(`❌ Missing table: exams`);
        showSetupInstructions();
        return false;
    }
    
    console.log("✅ All tables exist, proceeding with prepopulation...");
    return await prepopulateExams();
};

export const getStudentExams = async (studentId: string): Promise<Exam[]> => {
    try {
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('class, section')
            .eq('id', studentId)
            .single();

        if (studentError || !studentData) {
            console.error("Could not get student class for exams:", studentError);
            return [];
        }

        const { data, error } = await supabase
            .from('exams')
            .select('*');

        if (error) {
            console.error("Error fetching exams for student:", error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error("Error in getStudentExams:", error);
        return [];
    }
};
