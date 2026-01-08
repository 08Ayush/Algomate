'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Mail,
  Lock,
  Shield,
  Users,
  Brain,
  CheckCircle2,
  UserCircle,
  ArrowRight
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    collegeUid: '',
    password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlMessage = searchParams.get('message');
    if (urlMessage) {
      setMessage(urlMessage);
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.collegeUid.trim()) {
      newErrors.collegeUid = 'College UID is required';
    } else if (!/^[A-Z0-9-]+$/i.test(formData.collegeUid)) {
      newErrors.collegeUid = 'Please enter a valid College UID';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collegeUid: formData.collegeUid,
          password: formData.password,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const userProfile = {
        ...data.userData,
        cachedAt: Date.now()
      };
      localStorage.setItem('user', JSON.stringify(userProfile));

      if (data.userData.colleges) {
        localStorage.setItem('college', JSON.stringify(data.userData.colleges));
      }

      if (data.userData.departments) {
        localStorage.setItem('department', JSON.stringify(data.userData.departments));
      }

      const role = data.userData.role;
      const facultyType = data.userData.faculty_type;

      switch (role) {
        case 'super_admin':
          router.push('/super-admin/dashboard');
          break;
        case 'admin':
        case 'college_admin':
          router.push('/admin/dashboard');
          break;
        case 'faculty':
          if (facultyType === 'creator' || facultyType === 'publisher' || facultyType === 'general') {
            router.push('/faculty/dashboard');
          }
          break;
        case 'student':
          router.push('/student/dashboard');
          break;
        default:
          router.push('/dashboard');
      }

    } catch (error: any) {
      console.error('Login error:', error);
      if (error.name === 'AbortError') {
        setErrors({ submit: 'Login is taking too long. Please check your internet connection and try again.' });
      } else {
        setErrors({ submit: error.message || 'Login failed. Please check your credentials.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10 relative overflow-hidden bg-gradient-to-br from-[#EEF7FF] via-[#B8E5E5] to-white">
      <div className="max-w-[1100px] w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-white rounded-[30px] p-8 md:p-16 shadow-[0_20px_60px_rgba(37,99,163,0.15)]">

        {/* Left Side - Illustration */}
        <motion.div
          className="hidden lg:flex items-center justify-center p-5"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative w-full max-w-[450px]">
            <div className="relative h-[400px] flex items-center justify-center">
              {/* Morphing background blob */}
              <div className="absolute w-[350px] h-[350px] bg-gradient-to-br from-[#B8E5E5]/40 to-[#5FB3B3]/30 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] animate-[morph_8s_ease-in-out_infinite]" />

              {/* Phone mockup */}
              <div className="relative w-[200px] h-[350px] bg-gradient-to-br from-white to-[#f0f9ff] rounded-[30px] border-8 border-[#2563A3] p-5 shadow-[0_20px_50px_rgba(37,99,163,0.2)] z-10 flex flex-col items-center gap-4">
                <Shield size={48} className="text-[#2563A3] mt-2" />
                <div className="w-full flex flex-col items-center gap-3 mt-5">
                  <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#2563A3] to-[#5FB3B3] mb-2" />
                  <div className="w-4/5 h-2 bg-[#e0e7ff] rounded" />
                  <div className="w-3/5 h-2 bg-[#e0e7ff] rounded" />
                  <Lock size={32} className="text-[#2563A3] mt-5" />
                </div>
              </div>

              {/* Person icon decoration */}
              <div className="absolute bottom-[30px] right-[-30px] z-20 bg-gradient-to-br from-[#5FB3B3] to-[#2563A3] p-4 rounded-full shadow-[0_10px_30px_rgba(37,99,163,0.3)]">
                <UserCircle size={80} className="text-white" />
              </div>

              {/* Graduation cap decoration */}
              <div className="absolute bottom-5 left-2 z-20 bg-gradient-to-br from-[#5FB3B3] to-[#2563A3] p-2 rounded-full shadow-[0_8px_20px_rgba(37,99,163,0.25)]">
                <GraduationCap size={40} className="text-white" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Form */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[#2563A3] mb-2">Welcome!</h2>
            <p className="text-slate-600 text-base">Sign In to your Account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Success Message */}
            {message && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600">{message}</p>
              </div>
            )}

            {/* Error Display */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* College UID Input */}
            <div className="flex flex-col gap-2">
              <div className="relative bg-gradient-to-br from-[#e6eef2] to-[#f2f7fa] rounded-full shadow-[inset_8px_8px_16px_rgba(190,210,220,0.5),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] transition-all duration-300 focus-within:shadow-[inset_10px_10px_20px_rgba(190,210,220,0.6),inset_-6px_-6px_12px_rgba(255,255,255,0.95)]">
                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8e9fb0] z-10" />
                <input
                  type="text"
                  id="collegeUid"
                  name="collegeUid"
                  value={formData.collegeUid}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-none outline-none text-[15px] text-[#2d3748] font-medium py-4 px-5 pl-14 rounded-full placeholder:text-[#a8b8c8] placeholder:font-normal"
                  placeholder="College UID"
                />
              </div>
              {errors.collegeUid && (
                <p className="text-sm text-red-600 px-5">{errors.collegeUid}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <div className="relative bg-gradient-to-br from-[#e6eef2] to-[#f2f7fa] rounded-full shadow-[inset_8px_8px_16px_rgba(190,210,220,0.5),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] transition-all duration-300 focus-within:shadow-[inset_10px_10px_20px_rgba(190,210,220,0.6),inset_-6px_-6px_12px_rgba(255,255,255,0.95)]">
                <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8e9fb0] z-10" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-none outline-none text-[15px] text-[#2d3748] font-medium py-4 px-5 pl-14 rounded-full placeholder:text-[#a8b8c8] placeholder:font-normal"
                  placeholder="Password"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 px-5">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="text-center -mt-2">
              <Link href="/forgot-password" className="text-[#2563A3] text-sm font-medium hover:text-[#5FB3B3] transition-colors">
                Forgot Password?
              </Link>
            </div>

            {/* Button Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <motion.button
                type="submit"
                disabled={isLoading}
                className="py-3.5 px-6 rounded-[25px] bg-gradient-to-br from-[#2563A3] to-[#5FB3B3] text-white text-sm font-bold uppercase tracking-wide shadow-[0_4px_15px_rgba(37,99,163,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,163,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isLoading ? 1 : 1.02, y: isLoading ? 0 : -2 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  'SIGN IN'
                )}
              </motion.button>

              <motion.button
                type="button"
                onClick={() => router.push('/register')}
                className="py-3.5 px-6 rounded-[25px] border-2 border-[#2563A3] bg-transparent text-[#2563A3] text-sm font-bold uppercase tracking-wide hover:bg-[#B8E5E5] transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                SIGN UP
              </motion.button>
            </div>

            {/* Social Login */}
            <div className="flex items-center justify-center gap-5 mt-6 pt-6 border-t border-slate-200">
              <motion.div
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#B8E5E5] to-[#5FB3B3] flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                whileHover={{ y: -3, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              >
                <CheckCircle2 size={20} className="text-white" />
              </motion.div>
              <motion.div
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#5FB3B3] to-[#2563A3] flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                whileHover={{ y: -3, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              >
                <Brain size={20} className="text-white" />
              </motion.div>
              <motion.div
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2563A3] to-[#5FB3B3] flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                whileHover={{ y: -3, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              >
                <Users size={20} className="text-white" />
              </motion.div>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Keyframes for morph animation */}
      <style jsx global>{`
        @keyframes morph {
          0%, 100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
          50% {
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          }
        }
      `}</style>
    </div>
  );
}