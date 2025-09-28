
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function NavigationPreloader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // This is a simple way to trigger loading on path change.
    // For Next.js 13+ App Router, navigation is often too fast for a loader to be noticeable
    // for simple pages. This ensures it's shown for a very short duration for perceived performance.
    
    // We set loading to true, then false after a short delay.
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400); // Adjust delay as needed

    return () => clearTimeout(timer);

  }, [pathname]);

  // A more robust solution might use router events if available in a stable way
  // in future Next.js versions or a global state management for loading states.

  if (!loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="relative flex h-32 w-32 items-center justify-center">
            <div className="absolute h-full w-full animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <Image 
                src="https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png"
                alt="School Logo" 
                width={100} 
                height={100} 
                className="rounded-full"
                priority
            />
        </div>
    </div>
  );
}
