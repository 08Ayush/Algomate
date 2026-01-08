'use client';

import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
    {
        name: 'Dr. Rajesh Kumar',
        role: 'Principal, XYZ Engineering College',
        image: '👨‍🎓',
        quote: 'Academic Compass transformed our scheduling process. What used to take weeks now takes hours!',
        rating: 5
    },
    {
        name: 'Prof. Priya Sharma',
        role: 'HOD Computer Science, ABC University',
        image: '👩‍🏫',
        quote: 'The AI-powered timetabling is incredible. Zero conflicts and optimal resource utilization.',
        rating: 5
    },
    {
        name: 'Amit Patel',
        role: 'College Administrator, DEF Institute',
        image: '👨‍💼',
        quote: 'Best investment for our institution. The analytics and insights are game-changing.',
        rating: 5
    }
];

export function TestimonialsSection() {
    return (
        <section className="py-24 px-10 bg-white relative z-10">
            <div className="max-w-[1400px] mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        className="text-4xl lg:text-5xl font-bold text-[#2563A3] mb-4"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        Trusted by Leading Institutions
                    </motion.h2>
                    <p className="text-lg text-slate-600">See what educators are saying about us</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 relative"
                            initial={{ opacity: 0, scale: 0.9, rotateY: -20 }}
                            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15, duration: 0.6, type: 'spring' }}
                            whileHover={{
                                y: -10,
                                boxShadow: '0 25px 60px rgba(77, 134, 156, 0.2)',
                                transition: { duration: 0.3 }
                            }}
                        >
                            <Quote className="absolute top-6 right-6 text-[#B8E5E5]" size={40} />
                            <div className="flex gap-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} size={18} fill="#fbbf24" color="#fbbf24" />
                                ))}
                            </div>
                            <p className="text-slate-700 mb-6 italic">"{testimonial.quote}"</p>
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">{testimonial.image}</div>
                                <div>
                                    <h4 className="font-bold text-[#2563A3]">{testimonial.name}</h4>
                                    <p className="text-sm text-slate-600">{testimonial.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
