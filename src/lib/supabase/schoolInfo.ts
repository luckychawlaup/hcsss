
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const TABLE_NAME = 'school_info';
const INFO_ID = 'main'; // Fixed ID for the single row from the new SQL

export interface SchoolInfo {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  affiliation_no: string; // Renamed from affiliationNo
  school_code: string; // Renamed from schoolCode
  logo_url?: string;
  website?: string;
}

const defaultInfo: SchoolInfo = {
    id: 'main',
    name: "Hilton Convent School",
    email: "info@hiltonconvent.edu",
    phone: "+91-XXXXXXXXXX",
    address: "School Address Here",
    affiliation_no: "AFFILIATION_NUMBER",
    school_code: "SCHOOL_CODE",
};

export const SCHOOL_INFO_TABLE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.school_info (
    id TEXT PRIMARY KEY DEFAULT 'main',
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    affiliation_no TEXT NOT NULL,
    school_code TEXT NOT NULL,
    logo_url TEXT,
    website TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow principal to manage school info" ON public.school_info;
DROP POLICY IF EXISTS "Allow authenticated users to read school info" ON public.school_info;

CREATE POLICY "Allow principal to manage school info"
ON public.school_info FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '8ca56ec5-5e29-444f-931a-7247d65da329'::uuid) -- Owner UID
);

CREATE POLICY "Allow authenticated users to read school info"
ON public.school_info FOR SELECT
USING (auth.role() = 'authenticated');
`;

const ensureDefaultInfoExists = async () => {
    const { data, error } = await supabase.from(TABLE_NAME).select('id').eq('id', INFO_ID).maybeSingle();
    if (error && error.code !== 'PGRST116') { // Ignore "No rows found"
        console.error("Error checking for default school info:", error);
    }
    if (!data) {
        // If no row exists, create it with default values. This only needs to run once.
        const { error: insertError } = await supabase.from(TABLE_NAME).insert([defaultInfo]);
        if (insertError) {
            console.error("Could not create default school info row:", insertError);
        }
    }
};

// Get school info once
export const getSchoolInfo = async (): Promise<SchoolInfo | null> => {
    const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('id', INFO_ID).single();
    if (error && error.code !== 'PGRST116') { // Ignore "No rows found"
        console.error("Error fetching school info:", error);
    }
    if (!data) {
        await ensureDefaultInfoExists();
        return defaultInfo;
    }
    return data || defaultInfo;
};

// Get school info with real-time updates
export const getSchoolInfoRT = (callback: (info: SchoolInfo) => void) => {
    const channel = supabase
        .channel('school-info')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME, filter: `id=eq.${INFO_ID}`},
        (payload) => {
            callback((payload.new || defaultInfo) as SchoolInfo);
        })
        .subscribe(async (status) => {
             if (status === 'SUBSCRIBED') {
                const info = await getSchoolInfo();
                callback(info || defaultInfo);
            }
        });
    
    return channel;
};

// Update school info
export const updateSchoolInfo = async (info: Omit<SchoolInfo, 'id'>) => {
    const { data, error } = await supabase.from(TABLE_NAME).upsert({ id: INFO_ID, ...info }).select().single();
    if (error) {
        console.error("Error updating school info:", JSON.stringify(error, null, 2));
        throw error;
    }
    return data;
};
