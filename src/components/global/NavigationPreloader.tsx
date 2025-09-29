
"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function NavigationPreloader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    // This is a workaround to show a loader on route changes.
    // A better implementation would use Next.js's new loading.tsx file
    // or a more sophisticated state management approach.
    if (previousPath.current !== pathname) {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 1000); // Failsafe timeout
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    // This effect runs when the component using the Suspense boundary has loaded.
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
