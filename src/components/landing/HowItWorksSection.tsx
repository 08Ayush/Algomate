'use client';

import {
    Settings,
    BookOpen,
    Brain,
    CheckCircle2,
    Lightbulb
} from 'lucide-react';
import { motion } from 'framer-motion';

const howItWorks = [
    {
        step: '01',
        title: 'Setup Your Institution',
        description: 'Add departments, faculty, students, and classrooms to the system.',
        icon: Settings,
        color: '#8B5CF6'
    },
    {
        step: '02',
        title: 'Configure Subjects',
        description: 'Define courses, credits, and NEP bucket requirements for each program.',
        icon: BookOpen,
        color: '#EC4899'
    },
    {
        step: '03',
        title: 'Generate Timetable',
        description: 'Let AI create optimal schedules or design manually with intelligent suggestions.',
        icon: Brain,
        color: '#0EA5E9'
    },
    {
        step: '04',
        title: 'Review & Publish',
        description: 'Department heads and publishers review, approve, and publish to all stakeholders.',
        icon: CheckCircle2,
        color: '#10B981'
    }
];

export function HowItWorksSection() {
    return (
        <section className="py-24 px-10 bg-gradient-to-br from-slate-50 to-blue-50 relative z-10">
            <div className="max-w-[1400px] mx-auto">
                <div className="text-center mb-16">
                    <motion.div
                        className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md mb-6"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <Lightbulb size={20} className="text-[#2563A3]" />
                    </motion.div>
                    <motion.h2
                        className="text-4xl lg:text-5xl font-bold text-[#2563A3] mb-4"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        How It Works
                    </motion.h2>
                    <p className="text-lg text-slate-600">Get started in 4 simple steps</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {howItWorks.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <motion.div
                                key={index}
                                className="relative"
                                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2, duration: 0.8, type: 'spring' }}
                            >
                                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                                    <motion.div
                                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4"
                                        style={{ background: step.color }}
                                        whileHover={{ scale: 1.2, rotate: 360 }}
                                        transition={{ duration: 0.6 }}
                                    >
                                        {step.step}
                                    </motion.div>
                                    <motion.div
                                        className="mb-4"
                                        style={{ color: step.color }}
                                        whileHover={{ scale: 1.1, y: -5 }}
                                    >
                                        <Icon size={40} />
                                    </motion.div>
                                    <h3 className="text-xl font-bold text-[#2563A3] mb-2">{step.title}</h3>
                                    <p className="text-slate-600">{step.description}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
