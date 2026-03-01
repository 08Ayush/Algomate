'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useSemesterMode, SemesterMode } from '@/contexts/SemesterModeContext';
import {
    Building2,
    Users,
    BookOpen,
    GraduationCap,
    DoorOpen,
    Layers,
    BarChart3,
    LogOut,
    Bell,
    Clock,
    CheckCircle2,
    ChevronDown,
    Settings,
    AlertTriangle,
    ClipboardList,
    CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
    id: string;
    type: 'timetable_published' | 'schedule_change' | 'system_alert' | 'approval_request';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

interface CollegeAdminLayoutProps {
    children: React.ReactNode;
    activeTab: string;
}

const CollegeAdminLayout: React.FC<CollegeAdminLayoutProps> = ({ children, activeTab }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { semesterMode, setSemesterMode, modeLabel } = useSemesterMode();

    const [user, setUser] = useState<any>(null);
    const [college, setCollege] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
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
        if (parsedUser.role !== 'college_admin' && parsedUser.role !== 'admin' && parsedUser.role !== 'super_admin') {
            router.push('/login?message=Access denied. College admin only.');
            return;
        }
        setUser(parsedUser);
        fetchCollegeInfo(parsedUser);
        fetchNotifications(parsedUser.id);
    }, [router]);

    const fetchCollegeInfo = async (user: any) => {
        if (!user.college_id) return;
        try {
            const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
            const res = await fetch(`/api/admin/colleges?college_id=${user.college_id}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.colleges && data.colleges.length > 0) {
                    setCollege(data.colleges[0]);
                }
            }
        } catch (e) {
            console.error('Error fetching college info');
        }
    };

    const fetchNotifications = async (userId: string) => {
        try {
            const res = await fetch(`/api/notifications?user_id=${userId}&limit=10`);
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
                headers: { 'Content-Type': 'application/json' },
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
    };

    const navItems = [
        { id: 'dashboard', icon: BarChart3, label: 'Dashboard', path: '/admin/dashboard' },
        { id: 'departments', icon: Building2, label: 'Departments', path: '/admin/departments' },
        { id: 'faculty', icon: Users, label: 'Faculty', path: '/admin/faculty' },
        { id: 'classrooms', icon: DoorOpen, label: 'Classrooms', path: '/admin/classrooms' },
        { id: 'batches', icon: Layers, label: 'Batches', path: '/admin/batches' },
        { id: 'subjects', icon: BookOpen, label: 'Subjects', path: '/admin/subjects' },
        { id: 'courses', icon: GraduationCap, label: 'Courses', path: '/admin/courses' },
        { id: 'students', icon: Users, label: 'Students', path: '/admin/students' },
        { id: 'buckets', icon: ClipboardList, label: 'Elective Buckets', path: '/admin/buckets' },
        { id: 'subject-allotment', icon: CheckSquare, label: 'Subject Allotment', path: '/admin/subject-allotment' },
        { id: 'constraints', icon: Settings, label: 'Constraints', path: '/admin/constraints' },
        { id: 'communication', icon: Bell, label: 'Communication', path: '/admin/communication' },
    ];

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4D869C] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2]">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-[70px] bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] shadow-lg z-50 flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <svg width="40" height="40" viewBox="0 0 50 50" fill="none">
                        <circle cx="25" cy="25" r="23" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2" />
                        <path d="M25 12 L33 18 L33 30 L25 36 L17 30 L17 18 Z" fill="white" stroke="white" strokeWidth="0.5" />
                    </svg>
                    <h1 className="text-white text-[22px] font-bold">Academic Compass</h1>
                </div>

                <div className="flex items-center gap-6">
                    {/* College Badge */}
                    {college && (
                        <div className="bg-white/20 px-4 py-2 rounded-xl text-white text-sm font-medium">
                            <span className="opacity-80">College:</span> {college.name}
                        </div>
                    )}

                    {/* Semester Mode Toggle */}
                    <div className="flex items-center bg-white/15 rounded-xl p-1 gap-1">
                        {(['odd', 'even', 'all'] as SemesterMode[]).map((mode) => {
                            const labels: Record<SemesterMode, string> = {
                                odd: 'Odd Sem',
                                even: 'Even Sem',
                                all: 'All Sem',
                            };
                            const isActive = semesterMode === mode;
                            return (
                                <button
                                    key={mode}
                                    onClick={() => setSemesterMode(mode)}
                                    title={mode === 'odd' ? 'Semesters 1, 3, 5, 7' : mode === 'even' ? 'Semesters 2, 4, 6, 8' : 'All 8 Semesters'}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border-none cursor-pointer ${isActive
                                        ? 'bg-white text-[#4D869C] shadow-md'
                                        : 'text-white/80 hover:text-white hover:bg-white/20'
                                        }`}
                                >
                                    {labels[mode]}
                                </button>
                            );
                        })}
                    </div>

                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="bg-white/20 hover:bg-white/30 border-none rounded-xl px-4 py-2 cursor-pointer flex items-center transition-all duration-300"
                        >
                            <Bell size={20} className="text-white" />
                            {notifications.some(n => !n.is_read) && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-[50px] right-0 bg-white rounded-2xl shadow-xl w-[350px] overflow-hidden z-50 border border-gray-100"
                                >
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="font-bold text-gray-800">Notifications</h3>
                                        <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                            {notifications.filter(n => !n.is_read).length} Unread
                                        </span>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
                                        ) : (
                                            notifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                                                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-full ${notification.type === 'system_alert' ? 'bg-orange-100 text-orange-600' :
                                                            notification.type === 'timetable_published' ? 'bg-green-100 text-green-600' :
                                                                'bg-blue-100 text-blue-600'
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
                                                        {!notification.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>}
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
                            className="flex items-center gap-3 bg-transparent border-none cursor-pointer focus:outline-none"
                        >
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold border border-white/30 text-sm">
                                {user?.first_name?.[0] || 'A'}
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
                                                {user?.first_name?.[0] || 'A'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm m-0">{user?.first_name} {user?.last_name}</p>
                                                <p className="text-xs text-gray-500 m-0 truncate w-[140px]">{user?.email}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">UID:</span>
                                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-[10px] break-all">{user?.college_uid || 'Unknown'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">Role:</span>
                                                <span className="text-[#4D869C] font-bold bg-[#4D869C]/10 px-2 py-0.5 rounded">College Admin</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2">
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

            {/* Sidebar */}
            <motion.aside
                initial={{ width: '90px' }}
                animate={{ width: sidebarOpen ? '280px' : '90px' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onMouseEnter={() => setSidebarOpen(true)}
                onMouseLeave={() => setSidebarOpen(false)}
                className="fixed top-[70px] left-0 h-[calc(100vh-70px)] bg-white/80 backdrop-blur-lg shadow-xl z-40 overflow-y-auto no-scrollbar"
            >
                <div className="relative flex items-center p-6 mb-2 h-[80px]">
                    <div className="min-w-[42px] flex justify-center items-center">
                        <Building2 size={32} className="text-[#4D869C]" />
                    </div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: sidebarOpen ? 1 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-4 whitespace-nowrap overflow-hidden"
                    >
                        <h2 className="text-xl font-bold text-gray-800 m-0">College Admin</h2>
                    </motion.div>
                </div>

                <nav className="flex flex-col gap-1 px-3 pb-4">
                    {navItems.map(({ id, icon: Icon, label, path }) => (
                        <button
                            key={id}
                            onClick={() => router.push(path)}
                            className={`group flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all cursor-pointer border-none overflow-hidden whitespace-nowrap ${activeTab === id
                                ? 'bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] text-white shadow-md'
                                : 'bg-transparent text-gray-700 hover:bg-gray-100'
                                }`}
                            title={!sidebarOpen ? label : ''}
                        >
                            <div className="min-w-[42px] flex justify-center">
                                <Icon size={20} className={activeTab === id ? 'text-white' : 'text-gray-500 group-hover:text-[#4D869C]'} />
                            </div>
                            <motion.span
                                animate={{ opacity: sidebarOpen ? 1 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="font-medium"
                            >
                                {label}
                            </motion.span>
                        </button>
                    ))}
                </nav>
            </motion.aside>

            {/* Main Content */}
            <motion.main
                animate={{ marginLeft: sidebarOpen ? '280px' : '90px' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="mt-[70px] pb-20 min-h-[calc(100vh-150px)] w-auto pr-8 pt-8"
            >
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="px-8"
                >
                    {children}
                </motion.div>
            </motion.main>
        </div>
    );
};

export default CollegeAdminLayout;
