'use client';

import { useRouter } from 'next/navigation';
import {
    Shield,
    GraduationCap,
    Users,
    Brain,
    CheckCircle2,
    UserCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const userRoles = [
    {
        role: 'Super Admin',
        icon: Shield,
        description: 'System configuration and global settings management',
        path: '/login?role=superadmin',
        color: 'linear-gradient(135deg, #2563A3 0%, #3B82C8 100%)'
    },
    {
        role: 'College Admin',
        icon: GraduationCap,
        description: 'Manage departments, faculty, and institutional settings',
        path: '/login?role=collegeadmin',
        color: 'linear-gradient(135deg, #5FB3B3 0%, #7DD3C0 100%)'
    },
    {
        role: 'Department Admin',
        icon: Users,
        description: 'Oversee department operations, approve timetables, and manage faculty within your department',
        path: '/login?role=departmentadmin',
        color: 'linear-gradient(135deg, #3B82C8 0%, #48A9A6 100%)'
    },
    {
        role: 'Faculty Creator',
        icon: Brain,
        description: 'Create and design timetables using AI or manual methods',
        path: '/login?role=creator',
        color: 'linear-gradient(135deg, #B8E5E5 0%, #D1EEEE 100%)'
    },
    {
        role: 'Faculty Publisher',
        icon: CheckCircle2,
        description: 'Review, approve, and publish finalized timetables',
        path: '/login?role=publisher',
        color: 'linear-gradient(135deg, #5FB3B3 0%, #7DD3C0 100%)'
    },
    {
        role: 'Faculty',
        icon: UserCircle,
        description: 'Access your schedule, manage classes, and track student attendance',
        path: '/login?role=faculty',
        color: 'linear-gradient(135deg, #48A9A6 0%, #5FB3B3 100%)'
    },
    {
        role: 'Student',
        icon: Users,
        description: 'View schedules, electives, and classroom information',
        path: '/login?role=student',
        color: 'linear-gradient(135deg, #2563A3 0%, #3B82C8 100%)'
    }
];

export function UserRolesSection() {
    const router = useRouter();

    return (
        <section id="roles" className="py-24 px-10 bg-white relative z-10">
            <div className="max-w-[1400px] mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        className="text-4xl lg:text-5xl font-bold text-[#2563A3] mb-4"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        Designed for Every Role
                    </motion.h2>
                    <p className="text-lg text-slate-600">Tailored experiences for all stakeholders</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-8">
                    {userRoles.map((role, index) => {
                        const Icon = role.icon;
                        return (
                            <motion.div
                                key={index}
                                className="flex flex-col items-center cursor-pointer"
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{
                                    delay: index * 0.1,
                                    duration: 0.6,
                                    type: 'spring',
                                    stiffness: 100
                                }}
                                whileHover={{
                                    scale: 1.08,
                                    y: -10,
                                    transition: { duration: 0.3 }
                                }}
                                onClick={() => router.push(role.path)}
                            >
                                <motion.div
                                    className="w-32 h-32 rounded-full flex items-center justify-center text-white shadow-lg mb-4"
                                    style={{ background: role.color }}
                                    whileHover={{
                                        boxShadow: '0 30px 80px rgba(77, 134, 156, 0.4)',
                                        transition: { duration: 0.3 }
                                    }}
                                >
                                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Icon size={32} />
                                    </div>
                                </motion.div>
                                <h4 className="text-center font-bold text-[#2563A3] text-sm">{role.role}</h4>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
