'use client';

import { CheckCircle2, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

export function AboutSection() {
    return (
        <section id="about" className="py-24 px-10 bg-gradient-to-br from-slate-50 to-blue-50 relative z-10">
            <div className="max-w-[1400px] mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        className="text-4xl lg:text-5xl font-bold text-[#2563A3] mb-4"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        About Academic Compass
                    </motion.h2>
                    <p className="text-lg text-slate-600">Revolutionizing education management with intelligent automation</p>
                </div>

                {/* Hero Story Section */}
                <motion.div
                    className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md mb-6">
                            <Rocket size={16} className="text-[#2563A3]" />
                            <span className="text-sm font-semibold text-[#2563A3]">Our Mission</span>
                        </div>
                        <h3 className="text-3xl font-bold text-[#2563A3] mb-4">Empowering Education Through Technology</h3>
                        <p className="text-slate-600 mb-4 leading-relaxed">
                            At Academic Compass, we believe that educational institutions deserve technology that works as hard as they do.
                            Our mission is to eliminate the complexity and time-consuming tasks associated with academic scheduling,
                            allowing educators to focus on what truly matters - teaching and inspiring the next generation.
                        </p>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Founded by educators and technologists, we've experienced firsthand the challenges of managing complex
                            timetables, coordinating faculty, and ensuring optimal resource utilization. That's why we created
                            Academic Compass - an AI-powered solution that transforms weeks of manual work into minutes of intelligent automation.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                                <span className="text-slate-700">AI-Powered Intelligence</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                                <span className="text-slate-700">NEP 2020 Compliant</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                                <span className="text-slate-700">99.9% Uptime Guarantee</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <img
                            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800"
                            alt="Team collaboration"
                            className="w-full h-auto rounded-2xl shadow-2xl"
                        />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
