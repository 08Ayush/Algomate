'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { PageLoader } from '@/components/ui/PageLoader';
import {
    Home,
    Calendar,
    BookOpen,
    Bell,
    User,
    LogOut,
    GraduationCap,
    Clock,
    FileText,
    ChevronDown,
    Settings,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StudentLayoutProps {
    children: React.ReactNode;
    activeTab: string;
}

interface Notification {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    type?: string;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children, activeTab }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const notificationRef = React.useRef<HTMLDivElement>(null);
    const profileRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'student') {
            router.push('/login');
            return;
        }
        setUser(parsedUser);
        fetchNotifications(parsedUser.id);
        fetchUserData(parsedUser.id);
    }, [router]);

    const fetchUserData = async (userId: string) => {
        try {
            const res = await fetch(`/api/student/dashboard?userId=${userId}&role=student`);
            const data = await res.json();
            if (data.success && data.user) {
                // Merge with existing user data to preserve key fields if any
                setUser((prev: any) => {
                    const updated = { ...prev, ...data.user };
                    localStorage.setItem('user', JSON.stringify(updated));
                    return updated;
                });
            }
        } catch (e) {
            console.error('Error fetching user data', e);
        }
    };

    const getAuthHeaders = (): Record<string, string> => {
        try {
            const raw = localStorage.getItem('user');
            if (!raw) return {};
            return { 'Authorization': `Bearer ${btoa(raw)}` };
        } catch { return {}; }
    };

    const fetchNotifications = async (userId: string) => {
        try {
            const res = await fetch(`/api/notifications?user_id=${userId}&limit=10`, {
                headers: { ...getAuthHeaders() }
            });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.data || []);
            }
        } catch (e) {
            console.error('Error fetching notifications');
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ user_id: user.id, notification_ids: [notificationId] })
            });
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        } catch (e) {
            console.error('Failed to mark as read');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        router.push('/');
        toast.success('Logged out successfully');
    };

    const navItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard', path: '/student/dashboard' },
        { id: 'timetable', icon: Calendar, label: 'Timetable', path: '/student/timetable' },
        { id: 'subjects', icon: BookOpen, label: 'My Subjects', path: '/student/subjects' },
        { id: 'assignments', icon: FileText, label: 'Assignments', path: '/student/assignments' },
        { id: 'nep-selection', icon: GraduationCap, label: 'NEP Selection', path: '/student/nep-selection' },
    ];

    if (!user) {
        return <PageLoader message="Loading Student Portal" subMessage="Verifying your session..." />;
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2]">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-[70px] bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] shadow-lg z-50 flex items-center justify-between px-4 lg:px-8">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <svg width="36" height="36" viewBox="0 0 50 50" fill="none">
                        <circle cx="25" cy="25" r="23" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2" />
                        <path d="M25 12 L33 18 L33 30 L25 36 L17 30 L17 18 Z" fill="white" stroke="white" strokeWidth="0.5" />
                    </svg>
                    <h1 className="text-white text-lg lg:text-xl font-bold hidden sm:block">Academic Compass</h1>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-2">
                    {navItems.map(({ id, icon: Icon, label, path }) => (
                        <button
                            key={id}
                            onClick={() => router.push(path)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${activeTab === id
                                ? 'bg-white text-[#4D869C] shadow-md'
                                : 'text-white/90 hover:bg-white/20'
                                }`}
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3 lg:gap-4">
                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="bg-white/20 hover:bg-white/30 border-none rounded-xl px-3 py-2 cursor-pointer flex items-center transition-all duration-300"
                        >
                            <Bell size={20} className="text-white" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold border-2 border-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-[50px] right-0 bg-white rounded-2xl shadow-xl w-[320px] lg:w-[350px] overflow-hidden z-50 border border-gray-100"
                                >
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="font-bold text-gray-800">Notifications</h3>
                                        <span className="text-xs font-medium px-2 py-0.5 bg-[#4D869C]/10 text-[#4D869C] rounded-full">
                                            {unreadCount} Unread
                                        </span>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center">
                                                <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                                                <p className="text-sm text-gray-500">No notifications</p>
                                            </div>
                                        ) : (
                                            notifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-[#4D869C]/5' : ''}`}
                                                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-full ${notification.type === 'system_alert' ? 'bg-orange-100 text-orange-600' :
                                                            notification.type === 'timetable_published' ? 'bg-green-100 text-green-600' :
                                                                'bg-[#4D869C]/10 text-[#4D869C]'
                                                            }`}>
                                                            {notification.type === 'system_alert' ? <AlertTriangle size={16} /> :
                                                                notification.type === 'timetable_published' ? <CheckCircle2 size={16} /> :
                                                                    <Bell size={16} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className={`text-sm ${!notification.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                                {notification.title}
                                                            </h4>
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                                                <Clock size={10} /> {new Date(notification.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        {!notification.is_read && <span className="w-2 h-2 bg-[#4D869C] rounded-full mt-2"></span>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Profile */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            className="flex items-center gap-2 lg:gap-3 bg-transparent border-none cursor-pointer focus:outline-none"
                        >
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold border border-white/30 text-sm">
                                {user?.first_name?.[0] || 'S'}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-white font-medium text-sm">{user?.first_name || 'Student'} {user?.last_name}</p>
                                <p className="text-white/70 text-xs">Student</p>
                            </div>
                            <ChevronDown size={16} className={`text-white transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showProfileDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-[50px] right-0 bg-white rounded-2xl shadow-xl w-[260px] overflow-hidden z-50 border border-gray-100"
                                >
                                    <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-[#4D869C] text-white flex items-center justify-center font-bold text-lg">
                                                {user?.first_name?.[0] || 'S'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm m-0">{user?.first_name || 'Student'} {user?.last_name || ''}</p>
                                                <p className="text-xs text-gray-500 m-0 truncate w-[140px]">{user?.email}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">UID:</span>
                                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-[10px]">{user?.college_uid || 'Unknown'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">Semester:</span>
                                                <span className="text-[#4D869C] font-bold bg-[#4D869C]/10 px-2 py-0.5 rounded">{user?.current_semester || '?'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">Role:</span>
                                                <span className="text-[#4D869C] font-bold bg-[#4D869C]/10 px-2 py-0.5 rounded">Student</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        <button
                                            onClick={() => router.push('/student/profile')}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-all font-medium text-sm"
                                        >
                                            <User size={18} /> My Profile
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium text-sm"
                                        >
                                            <LogOut size={18} /> Sign Out
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom shadow-lg">
                <div className="flex items-center justify-around py-2">
                    {navItems.map(({ id, icon: Icon, label, path }) => (
                        <button
                            key={id}
                            onClick={() => router.push(path)}
                            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === id
                                ? 'text-[#4D869C]'
                                : 'text-gray-500'
                                }`}
                        >
                            <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-[70px] min-h-screen pb-20 lg:pb-0">
                <div className="p-4 lg:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
