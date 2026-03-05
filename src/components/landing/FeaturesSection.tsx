'use client';

import {
    Calendar,
    BookOpen,
    Users,
    BarChart3,
    Shield,
    Zap,
    Brain,
    Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
    {
        icon: Calendar,
        number: '01',
        title: 'Intelligent Timetable Generation',
        description: 'AI-powered system accounts for teacher availability, room constraints, and student preferences to generate optimal timetables in minutes.',
        hoverBg: 'hover:bg-[#2563A3]',
        iconColor: '#2563A3',
    },
    {
        icon: BookOpen,
        number: '02',
        title: 'Smart Classroom Technology',
        description: 'Seamlessly connect devices, share content, and engage in real-time collaboration for dynamic and interactive lectures.',
        hoverBg: 'hover:bg-[#5FB3B3]',
        iconColor: '#5FB3B3',
    },
    {
        icon: Globe,
        number: '03',
        title: 'Comprehensive Learning Resources',
        description: 'Access digital textbooks, lecture notes, video tutorials, and curated research materials organized by course and topic.',
        hoverBg: 'hover:bg-[#3B82C8]',
        iconColor: '#3B82C8',
    },
    {
        icon: Users,
        number: '04',
        title: 'Vibrant Academic Community',
        description: 'Connect with peers, mentors, and professors. Participate in forums, form study groups, and share academic insights.',
        hoverBg: 'hover:bg-[#48A9A6]',
        iconColor: '#48A9A6',
    },
    {
        icon: BarChart3,
        number: '05',
        title: 'Advanced Analytics Dashboard',
        description: 'Monitor attendance, grades, and engagement metrics in real-time with comprehensive and beautiful data visualizations.',
        hoverBg: 'hover:bg-[#5FB3B3]',
        iconColor: '#5FB3B3',
    },
    {
        icon: Shield,
        number: '06',
        title: 'Secure & Reliable Platform',
        description: 'Enterprise-grade encryption, regular backups, and compliance with education data standards to keep data protected.',
        hoverBg: 'hover:bg-[#2563A3]',
        iconColor: '#2563A3',
    },
    {
        icon: Zap,
        number: '07',
        title: 'Real-Time Notifications',
        description: 'Instant alerts for schedule changes, assignment deadlines, and announcements via email, SMS, and in-app channels.',
        hoverBg: 'hover:bg-[#48A9A6]',
        iconColor: '#48A9A6',
    },
    {
        icon: Brain,
        number: '08',
        title: 'AI-Powered Insights',
        description: 'Personalized learning recommendations, predictive analytics, and smart resource allocation powered by ML algorithms.',
        hoverBg: 'hover:bg-[#3B82C8]',
        iconColor: '#3B82C8',
    }
];

export function FeaturesSection() {
    return (
        <section id="features" className="py-24 px-10 bg-slate-50 relative z-10">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-16 gap-6">
                    <div>
                        <motion.p
                            className="text-sm font-semibold tracking-[0.2em] uppercase text-[#2563A3] mb-3"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            Powerful Features
                        </motion.p>
                        <motion.h2
                            className="text-4xl lg:text-[44px] font-bold leading-tight text-slate-900"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            Tools built for modern<br />
                            <span className="text-[#2563A3]">academic excellence</span>
                        </motion.h2>
                    </div>
                    <motion.p
                        className="text-slate-500 max-w-md text-[15px] leading-relaxed lg:text-right"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        Everything your institution needs — from intelligent scheduling to real-time analytics, all in one platform.
                    </motion.p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <motion.div
                                key={index}
                                className={`group relative bg-white rounded-2xl p-7 shadow-sm border border-slate-100 transition-all duration-400 cursor-pointer ${feature.hoverBg} hover:shadow-2xl hover:border-transparent`}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{
                                    delay: index * 0.08,
                                    duration: 0.5,
                                    type: 'spring',
                                    stiffness: 100
                                }}
                                whileHover={{
                                    y: -8,
                                    transition: { duration: 0.25 }
                                }}
                            >
                                {/* Step Number */}
                                <span className="absolute top-5 right-6 text-[52px] font-bold text-slate-100 leading-none select-none group-hover:text-white/15 transition-colors duration-300">
                                    {feature.number}
                                </span>

                                {/* Icon */}
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:bg-white/20 transition-colors duration-300" style={{ backgroundColor: feature.iconColor }}>
                                    <Icon size={22} className="text-white" />
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-white transition-colors duration-300 relative z-10">
                                    {feature.title}
                                </h3>

                                {/* Description */}
                                <p className="text-sm text-slate-500 leading-relaxed group-hover:text-white/80 transition-colors duration-300 relative z-10">
                                    {feature.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
