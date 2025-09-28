
"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function NavigationPreloader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    // Only show preloader for actual page navigations, not initial load or simple query changes.
    if (previousPath.current !== pathname) {
      setLoading(true);
    }
    // Update previousPath to the new pathname for the next comparison.
    previousPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // This effect runs when the component using the Suspense boundary has loaded.
    // We can then safely turn off the loading indicator.
    // This relies on Next.js Suspense behavior.
    setLoading(false);
  }, [pathname]);


  if (!loading) {
    return null;
  }

  // Do not show preloader on the initial role selection page when interacting with it.
  if (pathname === '/login' && !loading) {
      return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="relative flex h-32 w-32 items-center justify-center">
            <div className="absolute h-full w-full animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <Image 
                src="/hcsss.png"
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
