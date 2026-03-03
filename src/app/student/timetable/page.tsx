'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    Clock,
    MapPin,
    Users,
    Download,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    Coffee,
    Utensils
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentLayout from '@/components/student/StudentLayout';

interface TimetableClass {
    id: string;
    subjectName: string;
    subjectCode: string;
    subjectType: string;
    facultyName: string;
    classroomName: string;
    building: string;
    day: string;
    startTime: string;
    endTime: string;
    isBreak: boolean;
    isLunch: boolean;
}

interface PublishedTimetable {
    id: string;
    title: string;
    academic_year: string;
    semester: number;
    batches: {
        id: string;
        name: string;
        section: string;
        semester: number;
    };
}

export default function StudentTimetable() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<PublishedTimetable | null>(null);
    const [classes, setClasses] = useState<TimetableClass[]>([]);
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Set initial selected day to today
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        setSelectedDay(days.includes(today) ? today : 'Monday');

        fetchTimetable(parsedUser);
    }, [router]);

    const fetchTimetable = async (user: any) => {
        try {
            setLoading(true);
            const token = btoa(JSON.stringify({
                id: user.id, user_id: user.id, role: user.role,
                college_id: user.college_id, department_id: user.department_id
            }));
            const authHeaders = { 'Authorization': `Bearer ${token}` };

            // Get batch info
            const dashRes = await fetch(`/api/student/dashboard?userId=${user.id}&role=student`, { headers: authHeaders });
            if (!dashRes.ok) throw new Error('Failed to fetch dashboard');
            const dashData = await dashRes.json();

            if (!dashData.additionalData?.batchId) {
                toast.error('No batch assigned');
                setLoading(false);
                return;
            }

            // Get timetables
            const ttRes = await fetch(
                `/api/student/published-timetables?courseId=${user.course_id}&semester=${dashData.additionalData.batch?.semester}`,
                { headers: authHeaders }
            );
            if (!ttRes.ok) throw new Error('Failed to fetch timetables');
            const ttData = await ttRes.json();

            const studentTT = ttData.timetables?.find(
                (tt: PublishedTimetable) => tt.batches?.id === dashData.additionalData.batchId
            );

            if (studentTT) {
                setTimetable(studentTT);

                // Fetch classes
                const classesRes = await fetch(`/api/student/timetable-classes?timetableId=${studentTT.id}`, { headers: authHeaders });
                if (classesRes.ok) {
                    const classesData = await classesRes.json();
                    setClasses(classesData.classes || []);
                    setTimeSlots(classesData.timeSlots || []);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load timetable');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const getClassesForDay = (day: string) => {
        return classes.filter(c => c.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    const getClassForSlot = (day: string, timeSlot: string) => {
        const [startTime] = timeSlot.split('-');
        const normalizeTime = (time: string) => time.substring(0, 5);
        return classes.find(
            cls => cls.day === day && normalizeTime(cls.startTime) === normalizeTime(startTime)
        );
    };

    const getSubjectColor = (subjectType: string, index: number) => {
        const colors = [
            { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
            { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
            { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
            { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
            { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
            { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800' },
        ];

        if (subjectType === 'LAB' || subjectType === 'PRACTICAL') {
            return { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' };
        }

        return colors[index % colors.length];
    };

    const navigateDay = (direction: 'prev' | 'next') => {
        const currentIndex = days.indexOf(selectedDay);
        if (direction === 'prev' && currentIndex > 0) {
            setSelectedDay(days[currentIndex - 1]);
        } else if (direction === 'next' && currentIndex < days.length - 1) {
            setSelectedDay(days[currentIndex + 1]);
        }
    };

    const exportTimetable = () => {
        if (!timetable) return;

        let htmlContent = `
            <html>
            <head>
                <title>Timetable - ${timetable.batches?.name}</title>
                <style>
                    body { font-family: system-ui, sans-serif; padding: 20px; }
                    h1 { color: #4338ca; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: center; }
                    th { background: #f3f4f6; font-weight: 600; }
                    .subject { font-weight: 600; }
                    .info { font-size: 0.85em; color: #6b7280; }
                </style>
            </head>
            <body>
                <h1>Weekly Class Schedule</h1>
                <p>Batch: ${timetable.batches?.name} | Semester: ${timetable.semester} | Year: ${timetable.academic_year}</p>
                <table>
                    <thead>
                        <tr><th>Time</th>${days.map(d => `<th>${d}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
        `;

        timeSlots.forEach(slot => {
            htmlContent += `<tr><td><strong>${slot}</strong></td>`;
            days.forEach(day => {
                const cls = getClassForSlot(day, slot);
                if (cls) {
                    if (cls.isBreak || cls.isLunch) {
                        htmlContent += `<td style="background:#fef3c7;">${cls.isLunch ? 'Lunch' : 'Break'}</td>`;
                    } else {
                        htmlContent += `<td><div class="subject">${cls.subjectCode}</div><div class="info">${cls.facultyName}</div><div class="info">${cls.classroomName}</div></td>`;
                    }
                } else {
                    htmlContent += '<td>-</td>';
                }
            });
            htmlContent += '</tr>';
        });

        htmlContent += '</tbody></table></body></html>';

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `timetable-${timetable.batches?.name}.html`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Timetable exported!');
    };

    if (loading) {
        return (
            <StudentLayout activeTab="timetable">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4D869C] border-t-transparent"></div>
                </div>
            </StudentLayout>
        );
    }

    const dayClasses = getClassesForDay(selectedDay);

    return (
        <StudentLayout activeTab="timetable">
            <div className="space-y-6 pb-20 lg:pb-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">My Timetable</h1>
                        {timetable && (
                            <p className="text-gray-500 mt-1">
                                {timetable.batches?.name} • Semester {timetable.semester} • {timetable.academic_year}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Toggle - Desktop */}
                        <div className="hidden lg:flex bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('day')}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'day' ? 'bg-white text-[#4D869C] shadow-sm' : 'text-gray-600'
                                    }`}
                            >
                                Day View
                            </button>
                            <button
                                onClick={() => setViewMode('week')}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'week' ? 'bg-white text-[#4D869C] shadow-sm' : 'text-gray-600'
                                    }`}
                            >
                                Week View
                            </button>
                        </div>
                        <button
                            onClick={exportTimetable}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#4D869C] text-white rounded-xl font-medium hover:bg-[#3d6b7c] transition-colors"
                        >
                            <Download size={18} />
                            <span className="hidden lg:inline">Export</span>
                        </button>
                    </div>
                </div>

                {/* Day Selector - Mobile */}
                <div className="lg:hidden">
                    <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <button
                            onClick={() => navigateDay('prev')}
                            disabled={days.indexOf(selectedDay) === 0}
                            className="p-2 rounded-xl bg-gray-100 disabled:opacity-30"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-center">
                            <p className="text-lg font-bold text-gray-900">{selectedDay}</p>
                            <p className="text-sm text-gray-500">{dayClasses.length} classes</p>
                        </div>
                        <button
                            onClick={() => navigateDay('next')}
                            disabled={days.indexOf(selectedDay) === days.length - 1}
                            className="p-2 rounded-xl bg-gray-100 disabled:opacity-30"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Day Pills */}
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
                        {days.map(day => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${selectedDay === day
                                    ? 'bg-[#4D869C] text-white'
                                    : 'bg-white text-gray-600 border border-gray-200'
                                    }`}
                            >
                                {day.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Day View - Mobile */}
                <div className="lg:hidden space-y-3">
                    {dayClasses.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar size={28} className="text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No classes on {selectedDay}</p>
                        </div>
                    ) : (
                        dayClasses.map((cls, index) => {
                            const color = getSubjectColor(cls.subjectType, index);

                            if (cls.isBreak || cls.isLunch) {
                                return (
                                    <div key={cls.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                                        {cls.isLunch ? <Utensils size={20} className="text-amber-600" /> : <Coffee size={20} className="text-amber-600" />}
                                        <div>
                                            <p className="font-medium text-amber-800">{cls.isLunch ? 'Lunch Break' : 'Break'}</p>
                                            <p className="text-sm text-amber-600">{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</p>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <motion.div
                                    key={cls.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`${color.bg} ${color.border} border rounded-2xl p-4`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className={`font-bold ${color.text}`}>{cls.subjectName}</h3>
                                            <p className="text-sm text-gray-600">{cls.subjectCode}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${color.bg} ${color.text}`}>
                                            {cls.subjectType}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-3">
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} />
                                            {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin size={14} />
                                            {cls.classroomName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200/50">
                                        <Users size={14} className="text-gray-500" />
                                        <span className="text-sm text-gray-600">{cls.facultyName}</span>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Week View - Desktop */}
                {viewMode === 'week' && (
                    <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 border-b border-r w-24">Time</th>
                                        {days.map(day => (
                                            <th key={day} className="px-4 py-3 text-center text-sm font-semibold text-gray-600 border-b border-r last:border-r-0">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeSlots.map((slot, slotIndex) => (
                                        <tr key={slot} className="border-b last:border-b-0">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-600 border-r bg-gray-50">
                                                {slot}
                                            </td>
                                            {days.map((day) => {
                                                const cls = getClassForSlot(day, slot);
                                                const color = cls ? getSubjectColor(cls.subjectType, slotIndex) : null;

                                                return (
                                                    <td key={day} className="px-2 py-2 border-r last:border-r-0 min-w-[140px]">
                                                        {cls ? (
                                                            cls.isBreak || cls.isLunch ? (
                                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                                                                    <span className="text-amber-700 text-sm font-medium">
                                                                        {cls.isLunch ? '🍽️ Lunch' : '☕ Break'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className={`${color?.bg} ${color?.border} border rounded-lg p-2`}>
                                                                    <p className={`font-semibold text-sm ${color?.text} truncate`}>{cls.subjectCode}</p>
                                                                    <p className="text-xs text-gray-600 truncate">{cls.subjectName}</p>
                                                                    <p className="text-xs text-gray-500 mt-1 truncate">{cls.facultyName}</p>
                                                                    <p className="text-xs text-gray-400 truncate">{cls.classroomName}</p>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className="h-16 flex items-center justify-center text-gray-300">—</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Day View - Desktop */}
                {viewMode === 'day' && (
                    <div className="hidden lg:block">
                        {/* Day Tabs */}
                        <div className="flex gap-2 mb-6">
                            {days.map(day => {
                                const count = getClassesForDay(day).length;
                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${selectedDay === day
                                            ? 'bg-[#4D869C] text-white shadow-lg'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:border-[#4D869C]'
                                            }`}
                                    >
                                        <p>{day}</p>
                                        <p className={`text-xs mt-1 ${selectedDay === day ? 'text-white/70' : 'text-gray-400'}`}>
                                            {count} class{count !== 1 ? 'es' : ''}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Classes Grid */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            {dayClasses.length === 0 ? (
                                <div className="text-center py-12">
                                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500 font-medium">No classes scheduled on {selectedDay}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {dayClasses.map((cls, index) => {
                                        const color = getSubjectColor(cls.subjectType, index);

                                        if (cls.isBreak || cls.isLunch) {
                                            return (
                                                <div key={cls.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                                        {cls.isLunch ? <Utensils className="text-amber-600" /> : <Coffee className="text-amber-600" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-amber-800">{cls.isLunch ? 'Lunch Break' : 'Break'}</p>
                                                        <p className="text-sm text-amber-600">{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <motion.div
                                                key={cls.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className={`${color.bg} ${color.border} border rounded-xl p-5 flex items-start gap-5`}
                                            >
                                                <div className={`w-14 h-14 rounded-xl ${color.bg} border ${color.border} flex items-center justify-center flex-shrink-0`}>
                                                    <BookOpen size={24} className={color.text} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className={`text-lg font-bold ${color.text}`}>{cls.subjectName}</h3>
                                                            <p className="text-gray-600">{cls.subjectCode}</p>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${color.bg} ${color.text} border ${color.border}`}>
                                                            {cls.subjectType}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-6 mt-4 text-gray-600">
                                                        <span className="flex items-center gap-2">
                                                            <Clock size={16} />
                                                            {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                                                        </span>
                                                        <span className="flex items-center gap-2">
                                                            <MapPin size={16} />
                                                            {cls.classroomName} {cls.building && `• ${cls.building}`}
                                                        </span>
                                                        <span className="flex items-center gap-2">
                                                            <Users size={16} />
                                                            {cls.facultyName}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
