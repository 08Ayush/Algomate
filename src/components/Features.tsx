'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, Bot, Shield, BarChart3, Database, MonitorSpeaker } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: Calendar,
      title: "AI-Powered Timetable Generation",
      description: "Advanced algorithms automatically create conflict-free schedules with optimal resource allocation and faculty workload balancing.",
      color: "text-blue-600"
    },
    {
      icon: MonitorSpeaker,
      title: "Resource Management",
      description: "Comprehensive classroom and resource management with real-time monitoring of facilities, equipment, and space utilization.",
      color: "text-green-600"
    },
    {
      icon: Bot,
      title: "Telegram Bot Integration",
      description: "Real-time notifications, schedule updates, and interactive commands through our intelligent Telegram bot system.",
      color: "text-purple-600"
    },
    {
      icon: Shield,
      title: "Department Security & Isolation",
      description: "Multi-tenant architecture with role-based access control ensuring complete data security and department privacy.",
      color: "text-orange-600"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics Dashboard",
      description: "Comprehensive insights into room utilization, faculty workload, and scheduling efficiency with predictive analytics.",
      color: "text-cyan-600"
    },
    {
      icon: Database,
      title: "Comprehensive Academic Management",
      description: "Complete student, faculty, subject, and batch management with automated conflict detection and resolution.",
      color: "text-pink-600"
    },
    {
      icon: Shield,
      title: "NEP 2020 Policy Compliance",
      description: "Full compliance with National Education Policy 2020, featuring Choice-Based Credit System (CBCS), flexible curricula, multidisciplinary learning, and credit-based evaluation.",
      color: "text-indigo-600"
    }
  ];

  return (
    <section id="features" className="py-20 bg-muted/50 relative">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Complete Timetable Scheduling & Resource Management with NEP 2020 Compliance
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to manage modern educational institutions with AI-powered timetable automation, resource optimization, and full National Education Policy 2020 compliance
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="relative overflow-hidden border-0 bg-background/80 backdrop-blur hover:bg-background/90 transition-all duration-300 hover:shadow-lg group"
              >
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 ${feature.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
