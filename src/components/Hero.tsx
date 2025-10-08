'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function Hero() {
  const stats = [
    { number: "500+", label: "Educational Institutions" },
    { number: "50,000+", label: "Students Managed" },
    { number: "2,000+", label: "Smart Classrooms" },
    { number: "99.9%", label: "System Uptime" }
  ];

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid" />
      <div className="container relative">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium shadow-sm animate-pulse">
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            Next-Generation Smart Timetable Management System
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Transform Your{" "}
            <span className="bg-gradient-to-r from-primary via-purple-600 to-purple-600 bg-clip-text text-transparent">
              Educational Institution
            </span>
            {" "}With Us
          </h1>
          <p className="mb-8 text-xl text-muted-foreground sm:text-2xl max-w-3xl mx-auto">
            The most advanced Smart Timetable Scheduling System. 
            Powered by automation, designed for excellence, built for the future of education.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-12">
            <Link 
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-blue-600 px-6 py-3 text-lg font-semibold text-primary-foreground hover:from-primary/90 hover:to-blue-600/90 transition-all shadow-lg hover:shadow-xl"
            >
              Start Your Free Trial Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border-2 border-border bg-background px-6 py-3 text-lg font-semibold hover:bg-accent transition-colors"
            >
              Access Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
