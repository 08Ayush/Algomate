'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, CheckCircle, Play, Shield, Zap, Building2 } from 'lucide-react';

export function Hero() {
  const stats = [
    { number: "500+", label: "Educational Institutions" },
    { number: "50,000+", label: "Students Managed" },
    { number: "2,000+", label: "Classrooms Managed" },
    { number: "99.9%", label: "System Uptime" }
  ];

  const highlights = [
    "NEP 2020 Compliant",
    "AI-Powered Scheduling",
    "Multi-Role Dashboards",
    "Real-time Analytics"
  ];

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      
      <div className="container relative">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-primary">Enterprise ERP for Education</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Trusted by 500+ Institutions</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            The Complete{" "}
            <span className="bg-gradient-to-r from-primary via-purple-600 to-purple-600 bg-clip-text text-transparent">
              Academic Management
            </span>
            {" "}Platform
          </h1>
          
          <p className="mb-6 text-xl text-muted-foreground sm:text-2xl max-w-3xl mx-auto">
            Streamline timetables, manage faculty workloads, track attendance, and automate 
            administrative tasks — all in one powerful, NEP 2020 compliant ERP system.
          </p>

          {/* Quick Highlights */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {highlights.map((item, index) => (
              <div 
                key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-sm"
              >
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-12">
            <Link 
              href="/demo"
              className="group w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-purple-600 px-8 py-4 text-lg font-semibold text-white hover:from-primary/90 hover:to-purple-600/90 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/25"
            >
              <Building2 className="mr-2 h-5 w-5" />
              Schedule a Free Demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/login"
              className="group w-full sm:w-auto inline-flex items-center justify-center rounded-xl border-2 border-border bg-background px-8 py-4 text-lg font-semibold hover:bg-accent transition-colors"
            >
              <Shield className="mr-2 h-5 w-5 text-muted-foreground" />
              Institution Login
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-16">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>AI-Powered Scheduling</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <span>24/7 Support</span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-1">
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
