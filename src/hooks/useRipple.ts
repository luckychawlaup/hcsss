
"use client";

import React from 'react';

export const useRipple = <T extends HTMLElement>() => {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const element = ref.current;

    if (element) {
      const handleRipple = (event: MouseEvent) => {
        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('span');
        const diameter = Math.max(element.clientWidth, element.clientHeight);
        const radius = diameter / 2;

        ripple.style.width = ripple.style.height = `${diameter}px`;
        ripple.style.left = `${event.clientX - rect.left - radius}px`;
        ripple.style.top = `${event.clientY - rect.top - radius}px`;
        ripple.classList.add('ripple-effect');

        element.appendChild(ripple);

        setTimeout(() => {
          ripple.remove();
        }, 600); // Corresponds to animation duration
      };

      element.addEventListener('click', handleRipple);

      return () => {
        element.removeEventListener('click', handleRipple);
      };
    }
  }, [ref]);

  return ref;
};
