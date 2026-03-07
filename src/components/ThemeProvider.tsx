'use client';

import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Algomate uses light mode only — remove dark class regardless of OS preference
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  return <>{children}</>;
}
