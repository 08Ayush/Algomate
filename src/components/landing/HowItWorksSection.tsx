'use client';

import {
    Settings,
    BookOpen,
    Brain,
    CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
    {
        title: 'Setup Your Institution',
        description: 'Add departments, faculty, students, and classrooms to the system.',
        icon: Settings,
    },
    {
        title: 'Configure Subjects',
        description: 'Define courses, credits, and NEP bucket requirements for each program.',
        icon: BookOpen,
    },
    {
        title: 'Generate Timetable',
        description: 'Let AI create optimal schedules or design manually with intelligent suggestions.',
        icon: Brain,
    },
    {
        title: 'Review & Publish',
        description: 'Department heads and publishers review, approve, and publish to all stakeholders.',
        icon: CheckCircle2,
    }
];

export function HowItWorksSection() {
    return (
        <section className="relative py-28 px-10 overflow-hidden z-10">
            {/* Blue gradient background aligned with footer */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#2563A3] via-[#1e4976] to-[#2563A3]" />

            {/* Decorative circles */}
            <div className="absolute top-10 left-10 w-40 h-40 border border-white/10 rounded-full" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 border border-white/10 rounded-full" />
            <div className="absolute bottom-10 right-20 w-32 h-32 border border-white/10 rounded-full" />
            <div className="absolute top-1/2 left-[15%] w-4 h-4 bg-white/20 rounded-full" />
            <div className="absolute bottom-20 left-[40%] w-3 h-3 bg-white/15 rounded-full" />
            <div className="absolute top-20 right-[30%] w-5 h-5 bg-white/10 rounded-full" />

            <div className="max-w-[1400px] mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.p
                        className="text-sm font-semibold tracking-[0.2em] uppercase text-[#5FB3B3] mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        Why Choose Us
                    </motion.p>
                    <motion.h2
                        className="text-4xl lg:text-[48px] font-bold text-white leading-tight"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        How Academic Compass Helps Your<br />
                        Institution Grow And Succeed
                    </motion.h2>
                </div>

                {/* Step Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <motion.div
                                key={index}
                                className="group bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-2xl transition-all duration-300"
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.15, duration: 0.6, type: 'spring' }}
                                whileHover={{
                                    y: -8,
                                    transition: { duration: 0.25 }
                                }}
                            >
                                {/* Hexagonal Icon */}
                                <div className="flex justify-center mb-6">
                                    <div className="relative w-[72px] h-[72px]">
                                        {/* Hexagon shape using clip-path */}
                                        <div
                                            className="w-full h-full bg-gradient-to-br from-[#5FB3B3] to-[#4A9A9A] flex items-center justify-center group-hover:from-[#2563A3] group-hover:to-[#5FB3B3] transition-all duration-300"
                                            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                                        >
                                            <Icon size={28} className="text-white" />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-[#2563A3] transition-colors duration-300">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    {step.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
