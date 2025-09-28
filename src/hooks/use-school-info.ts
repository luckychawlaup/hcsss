
"use client";

import { useState, useEffect } from 'react';
import { getSchoolInfoRT, SchoolInfo } from '@/lib/supabase/schoolInfo';

export function useSchoolInfo() {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = getSchoolInfoRT((currentInfo) => {
      setSchoolInfo(currentInfo);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
        unsubscribe.unsubscribe();
      }
    };
  }, []);

  return { schoolInfo, isLoading };
}
