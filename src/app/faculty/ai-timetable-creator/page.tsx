'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import TimetableCreatorIntegrated from '@/components/TimetableCreatorIntegrated';
import { motion } from 'framer-motion';
import { Bot, Sparkles, Zap } from 'lucide-react';
import { useSemesterMode } from '@/contexts/SemesterModeContext';

export default function AITimetableCreatorPage() {
  const router = useRouter();
  const { semesterMode, activeSemesters, modeLabel } = useSemesterMode();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);

      if (parsedUser.role !== 'faculty' || parsedUser.faculty_type !== 'creator') {
        router.push('/faculty/dashboard');
        return;
      }

      setUser(parsedUser);
      setLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2] flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-10 shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading AI Timetable Creator...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <FacultyCreatorLayout activeTab="ai-creator">
      <div className="space-y-6">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#4D869C] via-[#5a9aae] to-[#7AB2B2] rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <Bot size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">AI Timetable Creator</h1>
              <p className="text-white/80">Generate optimized timetables using advanced AI algorithms</p>
            </div>
            <div className="ml-auto flex gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                <Sparkles size={14} /> AI Powered
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                <Zap size={14} /> Smart Optimization
              </span>
            </div>
          </div>
        </motion.div>

        {/* Semester Mode Banner */}
        {semesterMode !== 'all' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${semesterMode === 'odd' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-violet-50 text-violet-700 border border-violet-200'
              }`}
          >
            <span className="w-2 h-2 rounded-full animate-pulse inline-block bg-current"></span>
            Active mode: <strong className="ml-1">{modeLabel}</strong>
            <span className="ml-1 text-xs opacity-70">— AI will target semesters {activeSemesters.join(', ')} only.</span>
          </motion.div>
        )}

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100"
        >
          <TimetableCreatorIntegrated user={user} activeSemesters={semesterMode === 'all' ? undefined : activeSemesters} />
        </motion.div>
      </div>
    </FacultyCreatorLayout>
  );
}
