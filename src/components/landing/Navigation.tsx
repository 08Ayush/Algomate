'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

export function Navigation() {
    const router = useRouter();
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getLinkHref = (anchor: string) => {
        return pathname === '/' ? anchor : `/${anchor}`;
    };

    return (
        <motion.nav
            className={`fixed top-0 left-0 right-0 z-[1000] py-4 transition-all duration-300 ${scrolled || pathname !== '/'
                ? 'bg-white/98 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.08)]'
                : 'bg-transparent'
                }`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="max-w-[1400px] mx-auto px-10 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <GraduationCap size={36} className="text-[#2563A3]" />
                    <h1 className="text-[22px] font-bold text-[#2563A3]">Algomate</h1>
                </Link>

                <div className="flex items-center gap-10">
                    <Link
                        href="/"
                        className="text-slate-600 font-medium text-[15px] transition-colors hover:text-[#2563A3] relative after:absolute after:bottom-[-5px] after:left-0 after:w-0 after:h-[2px] after:bg-[#2563A3] after:transition-all after:duration-300 hover:after:w-full"
                    >
                        Home
                    </Link>
                    <Link
                        href={getLinkHref('#features')}
                        className="text-slate-600 font-medium text-[15px] transition-colors hover:text-[#2563A3] relative after:absolute after:bottom-[-5px] after:left-0 after:w-0 after:h-[2px] after:bg-[#2563A3] after:transition-all after:duration-300 hover:after:w-full"
                    >
                        Features
                    </Link>
                    <Link
                        href={getLinkHref('#about')}
                        className="text-slate-600 font-medium text-[15px] transition-colors hover:text-[#2563A3] relative after:absolute after:bottom-[-5px] after:left-0 after:w-0 after:h-[2px] after:bg-[#2563A3] after:transition-all after:duration-300 hover:after:w-full"
                    >
                        About
                    </Link>
                    <Link
                        href={getLinkHref('#contact')}
                        className="text-slate-600 font-medium text-[15px] transition-colors hover:text-[#2563A3] relative after:absolute after:bottom-[-5px] after:left-0 after:w-0 after:h-[2px] after:bg-[#2563A3] after:transition-all after:duration-300 hover:after:w-full"
                    >
                        Contact Us
                    </Link>
                    <button
                        className="px-8 py-3 bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        onClick={() => router.push('/login')}
                    >
                        <span>Sign In</span>
                    </button>
                </div>
            </div>
        </motion.nav>
    );
}
