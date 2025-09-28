
"use client";

import { useState, useEffect } from 'react';

// Corresponds to md: breakpoint in Tailwind CSS (768px)
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // This function will only run on the client, after the initial server render
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Run the check once on mount
    checkDevice();

    // Add an event listener for window resize
    window.addEventListener('resize', checkDevice);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []); // The empty dependency array ensures this effect runs only once on mount

  return isMobile;
}
