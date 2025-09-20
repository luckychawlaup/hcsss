
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SchoolSettings } from '@/lib/supabase/settings';
import { getSchoolSettingsRT } from '@/lib/supabase/settings';
import { Skeleton } from '../ui/skeleton';

interface ThemeProviderProps {
  children: React.ReactNode;
  settings: SchoolSettings; // Accept initial settings to prevent flicker
}

interface ThemeContextType {
  settings: SchoolSettings;
  setSettings: React.Dispatch<React.SetStateAction<SchoolSettings>>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hslToCssVar(hsl: string | undefined) {
    if (!hsl) return '';
    // This regex is safer and handles different spacing
    const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+%)\s*,\s*(\d+%)\s*\)/);
    if (match) {
        return `${match[1]} ${match[2]} ${match[3]}`;
    }
    return '';
}


export function ThemeProvider({ children, settings: initialSettings }: ThemeProviderProps) {
  const [settings, setSettings] = useState<SchoolSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Apply initial settings immediately to prevent flicker
    if (initialSettings.primaryColor) {
      document.documentElement.style.setProperty('--primary', hslToCssVar(initialSettings.primaryColor));
    }
    if (initialSettings.accentColor) {
      document.documentElement.style.setProperty('--accent', hslToCssVar(initialSettings.accentColor));
    }

    // Then, subscribe to real-time updates which will overwrite the initial settings
    const channel = getSchoolSettingsRT((newSettings) => {
        setSettings(newSettings);
        if (newSettings.primaryColor) {
            document.documentElement.style.setProperty('--primary', hslToCssVar(newSettings.primaryColor));
        }
        if (newSettings.accentColor) {
            document.documentElement.style.setProperty('--accent', hslToCssVar(newSettings.accentColor));
        }
        setIsLoading(false);
    });

    return () => {
        if(channel) {
            channel.unsubscribe();
        }
    };
  }, [initialSettings]);

  return (
    <ThemeContext.Provider value={{ settings, setSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
