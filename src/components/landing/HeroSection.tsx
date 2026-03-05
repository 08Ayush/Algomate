'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function HeroSection() {
    const router = useRouter();

    const stats = [
        { number: '99%', label: 'Scheduling Accuracy' },
        { number: '10x', label: 'Faster Than Manual' },
        { number: '24/7', label: 'System Availability' },
        { number: '100%', label: 'Conflict-Free' }
    ];

    return (
        <section id="hero" className="min-h-screen flex items-center px-10 pt-[120px] pb-20 relative bg-gradient-to-br from-[#E3F4F4] via-[#D1EEEE] to-[#B8E5E5]">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center w-full">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
                >
                    <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                        <motion.span
                            className="block text-[#2563A3]"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                        >
                            Best Academic
                        </motion.span>
                        <motion.span
                            className="block text-[#5FB3B3]"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                        >
                            Management Software
                        </motion.span>
                        <motion.span
                            className="block text-[#2563A3]"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                        >
                            For Multidisciplinary
                        </motion.span>
                        <motion.span
                            className="block text-[#5FB3B3]"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                        >
                            Education!
                        </motion.span>
                    </h1>
                    <p className="text-xl text-slate-600 mb-8">
                        All-in-one place for flexible, automated and conflict-free academic scheduling.
                    </p>
                    <div className="flex gap-4 mb-12">
                        <input
                            type="email"
                            placeholder="Email"
                            className="flex-1 px-6 py-4 rounded-xl border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                        />
                        <button
                            className="px-8 py-4 bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                            onClick={() => router.push('/demo')}
                        >
                            <span>Schedule a Free Demo</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                className="text-center"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                            >
                                <h3 className="text-3xl font-bold text-[#2563A3] mb-1">{stat.number}</h3>
                                <p className="text-sm text-slate-600">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, type: 'spring', stiffness: 60 }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="relative w-full h-auto"
                    >
                        <img
                            src="/hero-collage.png"
                            alt="Algomate Platform Overview"
                            className="w-full h-auto rounded-2xl shadow-2xl"
                        />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
