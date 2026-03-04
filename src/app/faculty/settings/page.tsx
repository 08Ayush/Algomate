'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import { Settings, User, Bell, Lock, Palette, Clock, Save, Camera, Briefcase, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeSection, setActiveSection] = useState('profile');

  // Profile Data
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    designation: ''
  });

  // Work Preferences Data
  const [workPreferences, setWorkPreferences] = useState({
    max_hours_per_day: 6,
    max_hours_per_week: 30,
    preferred_time_start: '09:00:00',
    preferred_time_end: '17:00:00',
    preferred_days: [] as string[]
  });

  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    weekly_digest: false,
    dark_mode: false,
    timezone: 'Asia/Kolkata'
  });

  const availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchSettings(parsedUser);
  }, [router]);

  const fetchSettings = async (userData: any) => {
    try {
      setFetching(true);
      const token = btoa(JSON.stringify({ id: userData.id, role: userData.role }));
      const response = await fetch('/api/faculty/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success && result.data) {
        setProfile({
          first_name: result.data.first_name || '',
          last_name: result.data.last_name || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          designation: result.data.designation || ''
        });
        setWorkPreferences({
          max_hours_per_day: result.data.max_hours_per_day || 6,
          max_hours_per_week: result.data.max_hours_per_week || 30,
          preferred_time_start: result.data.preferred_time_start || '09:00:00',
          preferred_time_end: result.data.preferred_time_end || '17:00:00',
          preferred_days: result.data.preferred_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setFetching(false);
    }
  };

  const saveSettings = async (data: any) => {
    setLoading(true);
    try {
      const token = btoa(JSON.stringify({ id: user.id, role: user.role }));
      const response = await fetch('/api/faculty/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Settings updated successfully');
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = () => {
    saveSettings(profile);
  };

  const handleSaveWorkPreferences = () => {
    saveSettings(workPreferences);
  };

  const toggleDay = (day: string) => {
    if (workPreferences.preferred_days.includes(day)) {
      setWorkPreferences({ ...workPreferences, preferred_days: workPreferences.preferred_days.filter(d => d !== day) });
    } else {
      setWorkPreferences({ ...workPreferences, preferred_days: [...workPreferences.preferred_days, day] });
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'work_preferences', label: 'Work Preferences', icon: Briefcase },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  if (fetching) {
    return (
      <FacultyCreatorLayout activeTab="settings">
        <CardLoader message="Loading Settings" subMessage="Fetching your preferences..." />
      </FacultyCreatorLayout>
    );
  }

  return (
    <FacultyCreatorLayout activeTab="settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="bg-white rounded-2xl shadow-lg p-4 h-fit">
            <nav className="space-y-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeSection === section.id
                    ? 'bg-[#4D869C] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <section.icon size={18} />
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Settings</h2>

                {/* Avatar */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-[#4D869C] text-white flex items-center justify-center text-3xl font-bold shadow-md">
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </div>
                    {/* <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border hover:bg-gray-50 flex items-center justify-center">
                      <Camera size={16} className="text-gray-600" />
                    </button> */}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{profile.first_name} {profile.last_name}</h3>
                    <p className="text-sm text-gray-500">{user?.college_uid} • {profile.designation || 'Faculty'}</p>
                    <p className="text-sm text-[#4D869C] font-medium mt-1 uppercase text-xs tracking-wider border border-[#4D869C]/20 px-2 py-0.5 rounded inline-block bg-[#4D869C]/5">
                      {user?.faculty_type}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">First Name</label>
                    <input
                      type="text"
                      value={profile.first_name}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Last Name</label>
                    <input
                      type="text"
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Email (Read Only)</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Phone</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Academic Designation</label>
                    <select
                      value={profile.designation}
                      onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all bg-white"
                    >
                      <option value="">Select Designation</option>
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Professor">Professor</option>
                      <option value="Guest Faculty">Guest Faculty</option>
                      <option value="Lecturer">Lecturer</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#4D869C] text-white rounded-xl font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all active:scale-95"
                  >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Work Preferences Section */}
            {activeSection === 'work_preferences' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Work Preferences</h2>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                  <Clock className="text-blue-600 mt-1 shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-blue-800 text-sm">Timetable Constraints</h4>
                    <p className="text-blue-700 text-xs mt-1">These preferences are used by the scheduling algorithm to optimize your timetable. Please be realistic.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Max Hours Per Day</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={workPreferences.max_hours_per_day}
                      onChange={(e) => setWorkPreferences({ ...workPreferences, max_hours_per_day: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Max Hours Per Week</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={workPreferences.max_hours_per_week}
                      onChange={(e) => setWorkPreferences({ ...workPreferences, max_hours_per_week: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Preferred Start Time</label>
                    <input
                      type="time"
                      value={workPreferences.preferred_time_start}
                      onChange={(e) => setWorkPreferences({ ...workPreferences, preferred_time_start: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Preferred End Time</label>
                    <input
                      type="time"
                      value={workPreferences.preferred_time_end}
                      onChange={(e) => setWorkPreferences({ ...workPreferences, preferred_time_end: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 ml-1">Preferred Working Days</label>
                  <div className="flex flex-wrap gap-3">
                    {availableDays.map(day => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-2.5 rounded-xl border font-medium transition-all ${workPreferences.preferred_days.includes(day)
                            ? 'bg-[#4D869C] border-[#4D869C] text-white shadow-md transform scale-105'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSaveWorkPreferences}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#4D869C] text-white rounded-xl font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all active:scale-95"
                  >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </motion.div>
            )}


            {activeSection === 'notifications' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

                <div className="space-y-4">
                  {/* ... (Existing notification toggles - kept static as placeholder/local only for now as requested schema didn't highlight dedicated settings table, typically jsonb or user fields) */}
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">Notification preferences coming soon.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'appearance' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Palette size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">Theme customization coming soon.</p>
                </div>
              </motion.div>
            )}

            {activeSection === 'security' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Lock size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">Security settings managed by College Admin.</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </FacultyCreatorLayout>
  );
};

export default SettingsPage;
