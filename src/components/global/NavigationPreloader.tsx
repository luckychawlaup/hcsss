
"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function NavigationPreloader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    // When the path changes, immediately set loading to true.
    if (previousPath.current !== pathname) {
      setLoading(true);
      previousPath.current = pathname;
    }
  }, [pathname]);

  // On the client, this component is part of a Suspense boundary.
  // When navigation starts, this component remains mounted, showing the loader.
  // When the new page is ready, React Suspense will swap the old content
  // with the new content, and this preloader component will be unmounted,
  // automatically hiding the loader.

  // The loading state is set back to false here as a cleanup/fallback mechanism,
  // ensuring the loader is hidden when the component unmounts or path changes again.
  useEffect(() => {
    return () => {
      setLoading(false);
    };
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
