

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
USING (auth.role() = 'authenticated');
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

        // We are ensuring no default exams are added.
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
        const { data, error } = await supabase
            .from(EXAMS_COLLECTION)
            .insert([exam])
            .select()
            .single(); // Using single() as we are inserting one record and expect one back.
        
        if (error) {
            // Throw a more informative error
            throw new Error(error.message || `Database error: ${error.details}`);
        }
        
        return data;
    } catch (e: any) {
        console.error("Unexpected error adding exam:", e.message);
        throw e; // Re-throw the error to be caught by the calling function
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
