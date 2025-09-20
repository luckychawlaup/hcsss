
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";

const SETTINGS_COLLECTION = "school_settings";
const SETTINGS_DOC_ID = "main"; // Use a single document for all settings

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
  const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  const unsubscribe = onSnapshot(settingsRef, async (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SchoolSettings);
    } else {
      // If settings doc doesn't exist, create it with defaults
      await setDoc(settingsRef, defaultSettings);
      callback(defaultSettings);
    }
  });
  return unsubscribe;
};

// Get school settings once for server components
export const getSchoolSettings = async (): Promise<SchoolSettings> => {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const snapshot = await getDoc(settingsRef);
    if(snapshot.exists()) {
        return snapshot.data() as SchoolSettings;
    }
    // If it doesn't exist, create and return it
    await setDoc(settingsRef, defaultSettings);
    return defaultSettings;
}


// Update school settings
export const updateSchoolSettings = async (
  updatedData: Partial<SchoolSettings>
) => {
  const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  await updateDoc(settingsRef, updatedData);
};
