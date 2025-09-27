
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

-- Create teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    subject TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    student_key TEXT UNIQUE,
    class TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development (adjust for production)
-- Drop existing policies if they exist, then recreate them
DO $ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow all operations on exams" ON public.exams;
    DROP POLICY IF EXISTS "Allow all operations on teachers" ON public.teachers;
    DROP POLICY IF EXISTS "Allow all operations on students" ON public.students;
    DROP POLICY IF EXISTS "Allow all operations on settings" ON public.settings;
    
    -- Create new policies
    CREATE POLICY "Allow all operations on exams" ON public.exams FOR ALL USING (true);
    CREATE POLICY "Allow all operations on teachers" ON public.teachers FOR ALL USING (true);
    CREATE POLICY "Allow all operations on students" ON public.students FOR ALL USING (true);
    CREATE POLICY "Allow all operations on settings" ON public.settings FOR ALL USING (true);
END $;

-- Insert default school settings
INSERT INTO public.settings (id, value) VALUES 
('school_settings', '{"school_name": "My School", "academic_year": "2024-2025"}')
ON CONFLICT (id) DO NOTHING;
`;

// Helper function to check if tables exist
export const checkTablesExist = async (): Promise<{
    exams: boolean;
    teachers: boolean;
    students: boolean;
    settings: boolean;
}> => {
    const results = {
        exams: false,
        teachers: false,
        students: false,
        settings: false
    };

    try {
        // Test each table
        const tables = ['exams', 'teachers', 'students', 'settings'];
        
        for (const table of tables) {
            try {
                const { error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(0);
                
                results[table as keyof typeof results] = !error;
                
                if (error) {
                    console.log(`Table '${table}' check result:`, {
                        exists: false,
                        code: error.code,
                        message: error.message
                    });
                } else {
                    console.log(`✅ Table '${table}' exists`);
                }
            } catch (e) {
                console.log(`❌ Table '${table}' does not exist or is inaccessible`);
            }
        }
    } catch (e) {
        console.error("Error checking tables:", e);
    }

    return results;
};

// Setup instructions for the user
export const showSetupInstructions = () => {
    console.log(`
🔧 SUPABASE SETUP REQUIRED 🔧

Your Supabase database tables don't exist yet. Please follow these steps:

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
            if (error.code === 'PGRST106') {
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
        
        // First check if tables exist
        const tablesStatus = await checkTablesExist();
        
        if (!tablesStatus.exams) {
            console.error("❌ Exams table doesn't exist!");
            console.log("📋 Setup SQL (copy and run in Supabase SQL Editor):");
            console.log(SETUP_SQL);
            showSetupInstructions();
            return false;
        }
        
        // Check if exams already exist
        const { data: existingExams, error: fetchError } = await supabase
            .from(EXAMS_COLLECTION)
            .select('id')
            .limit(1);

        if (fetchError) {
            console.error("Error checking existing exams:", {
                code: fetchError.code,
                message: fetchError.message,
                details: fetchError.details
            });
            return false;
        }

        if (existingExams && existingExams.length > 0) {
            console.log("✅ Exams already exist, skipping prepopulation");
            return true;
        }

        // Prepopulate with initial data - REMOVED DEFAULT EXAMS
        const initialExams:any[] = [];
        
        if (initialExams.length === 0) {
            console.log("✅ No default exams to add. Skipping prepopulation.");
            return true;
        }
        
        console.log("📝 Inserting initial exams:", initialExams);
        
        const { data, error } = await supabase
            .from(EXAMS_COLLECTION)
            .insert(initialExams)
            .select();
        
        if (error) {
            console.error("❌ Error prepopulating exams:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            
            // Provide specific guidance based on error codes
            if (error.code === 'PGRST106') {
                showSetupInstructions();
            } else if (error.code === '42703') {
                console.error("Column mismatch detected. Please verify your table schema matches the expected structure.");
            }
            
            return false;
        }
        
        console.log("✅ Successfully prepopulated exams:", data);
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
            .insert(exam)
            .select()
            .single();
        
        if (error) {
            console.error("Error adding exam:", error);
            return null;
        }
        
        return data;
    } catch (e) {
        console.error("Unexpected error adding exam:", e);
        return null;
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
    const missingTables = Object.entries(tablesStatus)
        .filter(([_, exists]) => !exists)
        .map(([table, _]) => table);
    
    if (missingTables.length > 0) {
        console.error(`❌ Missing tables: ${missingTables.join(', ')}`);
        showSetupInstructions();
        return false;
    }
    
    console.log("✅ All tables exist, proceeding with prepopulation...");
    return await prepopulateExams();
};
