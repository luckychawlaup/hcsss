
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SchoolSettings } from '@/lib/supabase/settings';
import { getSchoolSettingsRT } from '@/lib/supabase/settings';

interface ThemeProviderProps {
  children: React.ReactNode;
  settings: SchoolSettings;
}

interface AppThemeContextType {
  schoolSettings: SchoolSettings;
  setSchoolSettings: React.Dispatch<React.SetStateAction<SchoolSettings>>;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

function hslToCssVar(hsl: string | undefined) {
    if (!hsl) return '';
    const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*([\d.]+%)\s*,\s*([\d.]+%)\s*\)/);
    if (match) {
        return `${match[1]} ${match[2]} ${match[3]}`;
    }
    return '';
}

export function ThemeProvider({ children, settings: initialSettings }: ThemeProviderProps) {
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(initialSettings);
  
  useEffect(() => {
    if (initialSettings.primaryColor) {
      document.documentElement.style.setProperty('--primary', hslToCssVar(initialSettings.primaryColor));
      document.documentElement.style.setProperty('--ring', hslToCssVar(initialSettings.primaryColor));
    }
    if (initialSettings.accentColor) {
      document.documentElement.style.setProperty('--accent', hslToCssVar(initialSettings.accentColor));
    }

    const channel = getSchoolSettingsRT((newSettings) => {
        setSchoolSettings(newSettings);
        if (newSettings.primaryColor) {
            document.documentElement.style.setProperty('--primary', hslToCssVar(newSettings.primaryColor));
            document.documentElement.style.setProperty('--ring', hslToCssVar(newSettings.primaryColor));
        }
        if (newSettings.accentColor) {
            document.documentElement.style.setProperty('--accent', hslToCssVar(newSettings.accentColor));
        }
    });

    return () => {
        if(channel) {
            channel.unsubscribe();
        }
    };
  }, [initialSettings]);

  return (
    <AppThemeContext.Provider value={{ schoolSettings, setSchoolSettings }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(AppThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return { 
    settings: context.schoolSettings, 
    setSettings: context.setSchoolSettings,
  };
}
