'use client';

import Link from 'next/link';
import { GraduationCap, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export function FooterSection() {
    return (
        <footer className="bg-gradient-to-br from-[#2563A3] to-[#1e4976] text-white py-16 px-10">
            <div className="max-w-[1400px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <GraduationCap size={36} />
                            <h3 className="text-xl font-bold">Algomate</h3>
                        </div>
                        <p className="text-white/80 mb-4">
                            Revolutionizing education management with intelligent automation and AI-powered scheduling.
                        </p>
                        <div className="flex gap-3">
                            <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <Facebook size={18} />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <Twitter size={18} />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <Linkedin size={18} />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <Instagram size={18} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-bold mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            <li><a href="#hero" className="text-white/80 hover:text-white transition-colors">Home</a></li>
                            <li><a href="#features" className="text-white/80 hover:text-white transition-colors">Features</a></li>
                            <li><a href="#about" className="text-white/80 hover:text-white transition-colors">About</a></li>
                            <li><a href="#contact" className="text-white/80 hover:text-white transition-colors">Contact</a></li>
                            <li><Link href="/login" className="text-white/80 hover:text-white transition-colors">Login</Link></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="text-lg font-bold mb-4">Resources</h4>
                        <ul className="space-y-2">
                            <li><Link href="/docs" className="text-white/80 hover:text-white transition-colors">Documentation</Link></li>
                            <li><Link href="/privacy" className="text-white/80 hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="text-white/80 hover:text-white transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-lg font-bold mb-4">Contact Us</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <Mail size={18} className="mt-1 flex-shrink-0" />
                                <a href="mailto:pygramalgomate@gmail.com" className="text-white/80 hover:text-white transition-colors">pygramalgomate@gmail.com</a>
                            </li>
                            <li className="flex items-start gap-3">
                                <Phone size={18} className="mt-1 flex-shrink-0" />
                                <a href="tel:+917058435485" className="text-white/80 hover:text-white transition-colors">+91 7058435485</a>
                            </li>
                            <li className="flex items-start gap-3">
                                <MapPin size={18} className="mt-1 flex-shrink-0" />
                                <span className="text-white/80">Nagpur, Maharashtra, India</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/20 pt-8 text-center">
                    <p className="text-white/60">
                        © {new Date().getFullYear()} Algomate. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
