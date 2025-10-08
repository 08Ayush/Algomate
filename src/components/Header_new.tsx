'use client';

import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, GraduationCap, Sparkles } from 'lucide-react';

export function Header() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const currentTheme = theme === 'system' 
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <GraduationCap className="h-8 w-8 text-primary" />
            <Sparkles className="h-3 w-3 text-accent absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Academic Compass
            </span>
            <span className="text-xs text-muted-foreground font-medium">AI-Powered Learning</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
          <Link 
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-blue-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:from-primary/90 hover:to-blue-600/90 transition-all shadow-md hover:shadow-lg"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </header>
  );
}
