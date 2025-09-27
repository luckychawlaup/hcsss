import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const EXAMS_COLLECTION = 'exams';

export interface Exam {
    id: string;
    name: string;
    date: string;
    created_at?: string;
}

// Database setup SQL - you'll need to run this in your Supabase SQL editor
export const SETUP_SQL = `
-- Create exams table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Allow all operations on exams" ON public.exams;
DROP POLICY IF EXISTS "Allow authenticated users to manage exams" ON public.exams;

-- Create new policy that allows any authenticated user to manage exams
CREATE POLICY "Allow authenticated users to manage exams"
ON public.exams FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- If max_marks column exists, drop it since we don't need it at exam level
DO $ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'max_marks') THEN
        ALTER TABLE public.exams DROP COLUMN max_marks;
    END IF;
END $;
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
        .subscribe();
    
    // Initial fetch
    fetchAndCallbackExams(callback);
    
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
                date: exam.date
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
            return null;
        }
        
        return data;
    } catch (e) {
        console.error("Unexpected error updating exam:", e);
        return null;
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
            return false;
        }
        
        return true;
    } catch (e) {
        console.error("Unexpected error deleting exam:", e);
        return false;
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