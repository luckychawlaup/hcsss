
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const TABLE_NAME = 'school_info';
const INFO_ID = 'singleton_school_info_id'; // Fixed ID for the single row

export interface SchoolInfo {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  affiliationNo: string;
  schoolCode: string;
}

const defaultInfo: SchoolInfo = {
    name: "Hilton Convent School",
    email: "support@hiltonconvent.com",
    phone: "+91 12345 67890",
    address: "Joya Road, Amroha, 244221, Uttar Pradesh",
    affiliationNo: "2131151",
    schoolCode: "81259",
};

export const SCHOOL_INFO_TABLE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.school_info (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    "affiliationNo" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow principal to manage school info" ON public.school_info;
DROP POLICY IF EXISTS "Allow authenticated users to read school info" ON public.school_info;

CREATE POLICY "Allow principal to manage school info"
ON public.school_info FOR ALL
USING (auth.uid() = '6cc51c80-e098-4d6d-8450-5ff5931b7391') -- Principal UID
WITH CHECK (auth.uid() = '6cc51c80-e098-4d6d-8450-5ff5931b7391');

CREATE POLICY "Allow authenticated users to read school info"
ON public.school_info FOR SELECT
USING (auth.role() = 'authenticated');
`;


// Get school info once
export const getSchoolInfo = async (): Promise<SchoolInfo | null> => {
    const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('id', INFO_ID).single();
    if (error && error.code !== 'PGRST116') { // Ignore "No rows found"
        console.error("Error fetching school info:", error);
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
    const { error } = await supabase.from(TABLE_NAME).upsert({ id: INFO_ID, ...info });
    if (error) {
        console.error("Error updating school info:", error);
        throw error;
    }
};
