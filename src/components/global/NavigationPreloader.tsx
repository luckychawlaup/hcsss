
"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function NavigationPreloader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    // If the path changes, it means navigation has started.
    if (previousPath.current !== pathname) {
      setLoading(true);
    }
    
    // We update the previous path. For the *end* of the loading,
    // Next.js Suspense handles showing the content. When the new page
    // renders, this component will re-evaluate.
    previousPath.current = pathname;
    
    // A small delay to hide the loader allows Suspense to take over
    // and prevents flickering on very fast navigations.
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500); // This delay ensures the loader is visible for a minimum duration.

    return () => clearTimeout(timer);

  }, [pathname]);

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
