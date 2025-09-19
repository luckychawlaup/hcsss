
import { db } from "@/lib/firebase";
import {
  ref,
  onValue,
  get,
  update,
} from "firebase/database";

const SETTINGS_COLLECTION = "school_settings";

export interface SchoolSettings {
  schoolName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}

const defaultSettings: SchoolSettings = {
    schoolName: "Hilton Convent School",
    logoUrl: "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png",
    primaryColor: "hsl(217, 91%, 60%)",
    accentColor: "hsl(258, 90%, 66%)",
};

// Get school settings with real-time updates for client components
export const getSchoolSettingsRT = (
    callback: (settings: SchoolSettings) => void
) => {
  const settingsRef = ref(db, SETTINGS_COLLECTION);
  const unsubscribe = onValue(settingsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(defaultSettings);
    }
  });
  return unsubscribe;
};

// Get school settings once for server components
export const getSchoolSettings = async (): Promise<SchoolSettings> => {
    const settingsRef = ref(db, SETTINGS_COLLECTION);
    const snapshot = await get(settingsRef);
    if(snapshot.exists()) {
        return snapshot.val();
    }
    return defaultSettings;
}


// Update school settings
export const updateSchoolSettings = async (
  updatedData: Partial<SchoolSettings>
) => {
  const settingsRef = ref(db, SETTINGS_COLLECTION);
  await update(settingsRef, updatedData);
};
