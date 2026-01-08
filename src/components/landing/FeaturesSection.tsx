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
        title: 'Intelligent Timetable Generation',
        description: 'Effortlessly create and manage conflict-free schedules. Our AI-powered system accounts for teacher availability, room constraints, and student preferences to generate optimal timetables in minutes.',
        color: '#2563A3',
        image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500'
    },
    {
        icon: BookOpen,
        title: 'Smart Classroom Technology',
        description: 'Experience interactive learning with our state-of-art smart classroom integration. Seamlessly connect devices, share content, and engage in real-time collaboration for a more dynamic lecture environment.',
        color: '#5FB3B3',
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500'
    },
    {
        icon: Globe,
        title: 'Comprehensive Learning Resources',
        description: 'Access a vast repository of digital textbooks, lecture notes, video tutorials, and curated research materials. Our platform organizes resources by course and topic, making study materials readily available.',
        color: '#3B82C8',
        image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=500'
    },
    {
        icon: Users,
        title: 'Vibrant Academic Community',
        description: 'Connect with peers, mentors, and professors. Participate in discussion forums, form study groups, and share insights. Our platform fosters a supportive and collaborative environment for academic growth.',
        color: '#48A9A6',
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500'
    },
    {
        icon: BarChart3,
        title: 'Advanced Analytics Dashboard',
        description: 'Gain actionable insights with comprehensive performance tracking and beautiful data visualizations. Monitor attendance, grades, and engagement metrics in real-time for better outcomes.',
        color: '#7DD3C0',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500'
    },
    {
        icon: Shield,
        title: 'Secure & Reliable Platform',
        description: 'Your data security is our priority. Enterprise-grade encryption, regular backups, and compliance with education data standards ensure your information is always protected and accessible.',
        color: '#2563A3',
        image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500'
    },
    {
        icon: Zap,
        title: 'Real-Time Notifications',
        description: 'Stay updated with instant alerts for schedule changes, assignment deadlines, and important announcements. Multi-channel notifications via email, SMS, and in-app ensure you never miss critical information.',
        color: '#5FB3B3',
        image: 'https://images.unsplash.com/photo-1579869847557-1f67382cc158?w=500'
    },
    {
        icon: Brain,
        title: 'AI-Powered Insights',
        description: 'Leverage artificial intelligence for personalized learning recommendations, predictive analytics, and smart resource allocation. Our ML algorithms continuously optimize scheduling and improve outcomes.',
        color: '#3B82C8',
        image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500'
    }
];

export function FeaturesSection() {
    return (
        <section id="features" className="py-24 px-10 bg-white relative z-10">
            <div className="max-w-[1400px] mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        className="text-4xl lg:text-5xl font-bold text-[#2563A3] mb-4"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        Our Key Features: Empowering Your Academic Journey
                    </motion.h2>
                    <p className="text-lg text-slate-600">Everything you need to manage your institution efficiently and effectively</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <motion.div
                                key={index}
                                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-100px' }}
                                transition={{
                                    delay: index * 0.1,
                                    duration: 0.6,
                                    type: 'spring',
                                    stiffness: 80
                                }}
                                whileHover={{
                                    y: -10,
                                    transition: { duration: 0.3 }
                                }}
                            >
                                <div className="p-6 text-white" style={{ background: feature.color }}>
                                    <motion.div
                                        className="mb-4"
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Icon size={32} />
                                    </motion.div>
                                    <h3 className="text-xl font-bold">{feature.title}</h3>
                                </div>

                                <div className="h-48 overflow-hidden">
                                    <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                                </div>

                                <div className="p-6">
                                    <p className="text-slate-600 mb-4 text-sm leading-relaxed">{feature.description}</p>
                                    <motion.button
                                        className="text-[#2563A3] font-semibold text-sm hover:underline"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Learn More
                                    </motion.button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
