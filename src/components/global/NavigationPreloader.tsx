
"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function NavigationPreloader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      setLoading(true);
    }
    
    // A timer is still needed to give Suspense time to take over.
    // When the new page's content is ready, Suspense will unmount this loader.
    // If navigation is very fast, this prevents a flicker.
    const timer = setTimeout(() => {
      setLoading(false);
      previousPath.current = pathname;
    }, 1000); // Increased timeout to better handle complex pages

    return () => clearTimeout(timer);

  }, [pathname]);


  // This effect handles the initial page load case.
  useEffect(() => {
      const handleLoad = () => {
          setLoading(false);
      };
      
      // Check if document is already loaded
      if (document.readyState === 'complete') {
          handleLoad();
      } else {
          window.addEventListener('load', handleLoad);
          // Fallback timeout in case 'load' event doesn't fire
          const fallbackTimer = setTimeout(handleLoad, 1500);
          return () => {
              window.removeEventListener('load', handleLoad);
              clearTimeout(fallbackTimer);
          };
      }
  }, []);


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
