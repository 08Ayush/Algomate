'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Mail,
    ArrowRight,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Navigation } from '@/components/landing/Navigation';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [collegeUid, setCollegeUid] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, collegeUid }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process request');
            }

            setStatus('success');
            setMessage('If an account exists with these details, you will receive password reset instructions.');

        } catch (error: any) {
            setStatus('error');
            setMessage(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 md:p-10 relative overflow-hidden bg-gradient-to-br from-[#EEF7FF] via-[#B8E5E5] to-white">
            <Navigation />

            <div className="max-w-[500px] w-full bg-white rounded-[30px] p-8 md:p-12 shadow-[0_20px_60px_rgba(37,99,163,0.15)] relative z-10 mt-20">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#B8E5E5] to-[#5FB3B3] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
                        <Mail className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-[#2563A3] mb-2">Forgot Password?</h2>
                    <p className="text-slate-600">Enter your official email and College UID to receive reset instructions.</p>
                </div>

                {status === 'success' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center p-6 bg-green-50 rounded-2xl border border-green-100"
                    >
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-green-800 mb-2">Check your email</h3>
                        <p className="text-green-700 text-sm">{message}</p>
                        <Link
                            href="/login"
                            className="mt-6 inline-flex items-center text-[#2563A3] font-semibold hover:underline"
                        >
                            Back to Login <ArrowRight size={16} className="ml-1" />
                        </Link>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {status === 'error' && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{message}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">College UID</label>
                            <input
                                type="text"
                                value={collegeUid}
                                onChange={(e) => setCollegeUid(e.target.value)}
                                required
                                className="w-full bg-[#F0F7FF] border-2 border-transparent focus:border-[#5FB3B3] outline-none text-[#2d3748] font-medium py-3 px-5 rounded-xl transition-all"
                                placeholder="Enter your College UID"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Official Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-[#F0F7FF] border-2 border-transparent focus:border-[#5FB3B3] outline-none text-[#2d3748] font-medium py-3 px-5 rounded-xl transition-all"
                                placeholder="name@institution.edu"
                            />
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            className="mt-4 py-4 px-6 rounded-xl bg-gradient-to-br from-[#2563A3] to-[#5FB3B3] text-white font-bold uppercase tracking-wide shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: isLoading ? 1 : 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </motion.button>

                        <div className="text-center mt-4">
                            <Link href="/login" className="text-slate-500 hover:text-[#2563A3] font-medium transition-colors text-sm">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>

            {/* Decorative Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#B8E5E5]/20 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#2563A3]/10 rounded-full blur-3xl" />
        </div>
    );
}
