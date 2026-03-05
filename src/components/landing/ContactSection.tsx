'use client';

import { Mail, Phone, MapPin, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export function ContactSection() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send message');
            setSubmitted(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="contact" className="py-24 px-10 bg-white relative z-10">
            <div className="max-w-[1400px] mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        className="text-4xl lg:text-5xl font-bold text-[#2563A3] mb-4"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        Get In Touch
                    </motion.h2>
                    <p className="text-lg text-slate-600">Have questions? We'd love to hear from you.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Contact Information */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h3 className="text-2xl font-bold text-[#2563A3] mb-6">Contact Information</h3>
                        <p className="text-slate-600 mb-8">
                            Fill out the form and our team will get back to you within 24 hours.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#2563A3]/10 flex items-center justify-center flex-shrink-0">
                                    <Mail className="text-[#2563A3]" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-[#2563A3] mb-1">Email</h4>
                                    <p className="text-slate-600">pygramalgomate@gmail.com</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#2563A3]/10 flex items-center justify-center flex-shrink-0">
                                    <Phone className="text-[#2563A3]" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-[#2563A3] mb-1">Phone</h4>
                                    <p className="text-slate-600">+91 7058435485</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#2563A3]/10 flex items-center justify-center flex-shrink-0">
                                    <MapPin className="text-[#2563A3]" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-[#2563A3] mb-1">Address</h4>
                                    <p className="text-slate-600">Nagpur, Maharashtra, India</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        {submitted ? (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                                    <CheckCircle2 className="text-green-600" size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-[#2563A3] mb-3">Message Sent!</h3>
                                <p className="text-slate-600 mb-6">
                                    Thanks for reaching out. We'll get back to you within 24 hours.<br />
                                    Check your inbox for a confirmation email.
                                </p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="px-6 py-2 border-2 border-[#2563A3] text-[#2563A3] rounded-lg font-semibold hover:bg-[#2563A3] hover:text-white transition-colors"
                                >
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                                        placeholder="Your name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                                        placeholder="your.email@example.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
                                    <input
                                        type="text"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                                        placeholder="How can we help?"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        rows={5}
                                        className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors resize-none"
                                        placeholder="Your message..."
                                        required
                                    />
                                </div>

                                {error && (
                                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full px-8 py-4 bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Send Message</span>
                                            <Send size={20} />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
