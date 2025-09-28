
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const SETTINGS_ID = 'school_settings';

export interface SchoolSettings {
  id?: string;
  schoolName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}

const defaultSettings: SchoolSettings = {
    schoolName: "Hilton Convent School",
    logoUrl: "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png",
    primaryColor: "hsl(358, 80%, 47%)",
    accentColor: "hsl(358, 80%, 47%)",
};

// Get school settings with real-time updates
export const getSchoolSettingsRT = (callback: (settings: SchoolSettings) => void) => {
    const channel = supabase
        .channel('settings')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings', filter: `id=eq.${SETTINGS_ID}`},
        (payload) => {
            callback(payload.new as SchoolSettings);
        })
        .subscribe(async (status) => {
             if (status === 'SUBSCRIBED') {
                const { data, error } = await supabase.from('settings').select('*').eq('id', SETTINGS_ID).single();
                if (data) {
                    callback(data);
                } else if (error) {
                    console.warn("No school settings found, using defaults.", error.message);
                    callback(defaultSettings);
                }
            }
        });
    
    return channel;
};

// Update school settings
export const updateSchoolSettings = async (settings: Omit<SchoolSettings, 'id'>) => {
    const { error } = await supabase.from('settings').upsert({ id: SETTINGS_ID, ...settings });
    if (error) {
        console.error("Error updating settings:", error);
        throw error;
    }
};
