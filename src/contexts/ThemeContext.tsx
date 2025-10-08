'use client';

import React, { createContext, useContext } from 'react';

// Simplified context without theme switching - always light mode
interface ThemeContextType {
  theme: 'light';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = {
    theme: 'light' as const,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div className="min-h-screen bg-white">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}