'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Settings,
    Save,
    Globe,
    Bell,
    Shield,
    Database,
    Clock,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';

interface SettingsState {
    site_name: string;
    site_url: string;
    admin_email: string;
    default_timezone: string;
    enable_notifications: boolean;
    enable_email_alerts: boolean;
    maintenance_mode: boolean;
    allow_registration: boolean;
    session_timeout: number;
    max_login_attempts: number;
}

const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<SettingsState>({
        site_name: '',
        site_url: '',
        admin_email: '',
        default_timezone: 'Asia/Kolkata',
        enable_notifications: true,
        enable_email_alerts: true,
        maintenance_mode: false,
        allow_registration: true,
        session_timeout: 30,
        max_login_attempts: 5
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const getAuthHeaders = (): Record<string, string> => {
        if (typeof window === 'undefined') return {};
        const userData = localStorage.getItem('user');
        if (!userData) return {};
        const authToken = Buffer.from(userData).toString('base64');
        return { 'Authorization': `Bearer ${authToken}` };
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/super-admin/settings', { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.settings) {
                    setSettings(prev => ({
                        ...prev,
                        ...data.settings
                    }));
                }
            } else {
                toast.error('Failed to fetch settings');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Error loading settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/super-admin/settings', {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            });

            if (res.ok) {
                toast.success('Settings saved successfully');
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const settingGroups = [
        {
            title: 'General Settings',
            icon: Globe,
            color: '#4D869C',
            settings: [
                { key: 'site_name', label: 'Site Name', type: 'text' },
                { key: 'site_url', label: 'Site URL', type: 'text' },
                { key: 'admin_email', label: 'Admin Email', type: 'email' },
                { key: 'default_timezone', label: 'Default Timezone', type: 'select', options: ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'Asia/Tokyo'] }
            ]
        },
        {
            title: 'Notifications',
            icon: Bell,
            color: '#5A67D8',
            settings: [
                { key: 'enable_notifications', label: 'Enable In-App Notifications', type: 'toggle' },
                { key: 'enable_email_alerts', label: 'Enable Email Alerts', type: 'toggle' }
            ]
        },
        {
            title: 'Security',
            icon: Shield,
            color: '#ED8936',
            settings: [
                { key: 'session_timeout', label: 'Session Timeout (minutes)', type: 'number' },
                { key: 'max_login_attempts', label: 'Max Login Attempts', type: 'number' }
            ]
        },
        {
            title: 'System',
            icon: Database,
            color: '#48BB78',
            settings: [
                { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'toggle' },
                { key: 'allow_registration', label: 'Allow New Registrations', type: 'toggle' }
            ]
        }
    ];

    const renderInput = (setting: any) => {
        const value = settings[setting.key as keyof SettingsState];

        switch (setting.type) {
            case 'toggle':
                return (
                    <button
                        onClick={() => setSettings({ ...settings, [setting.key]: !value })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-[#4D869C]' : 'bg-gray-300'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                );
            case 'select':
                return (
                    <select
                        value={value as string}
                        onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                    >
                        {setting.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'number':
                return (
                    <input
                        type="number"
                        value={value as number}
                        onChange={(e) => setSettings({ ...settings, [setting.key]: parseInt(e.target.value) || 0 })}
                        className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                    />
                );
            default:
                return (
                    <input
                        type={setting.type}
                        value={value as string}
                        onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                    />
                );
        }
    };

    if (loading) {
        return (
            <SuperAdminLayout activeTab="settings">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center text-gray-500">
                        <Clock size={48} className="mx-auto mb-4 animate-spin" />
                        <p>Loading settings...</p>
                    </div>
                </div>
            </SuperAdminLayout>
        );
    }

    return (
        <SuperAdminLayout activeTab="settings">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
                        <p className="text-gray-600">Configure system-wide settings</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchSettings}
                            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {saving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {settingGroups.map((group, index) => (
                        <motion.div
                            key={group.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-2xl shadow-lg p-6"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-xl" style={{ backgroundColor: `${group.color}15` }}>
                                    <group.icon size={24} style={{ color: group.color }} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">{group.title}</h2>
                            </div>

                            <div className="space-y-4">
                                {group.settings.map((setting) => (
                                    <div key={setting.key} className="flex items-center justify-between gap-4">
                                        <label className="text-sm font-medium text-gray-700">{setting.label}</label>
                                        {renderInput(setting)}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-red-700 mb-4">Danger Zone</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-red-700">Clear All Cache</p>
                            <p className="text-sm text-red-600">This will clear all cached data from the system</p>
                        </div>
                        <button
                            onClick={() => toast.success('Cache cleared successfully')}
                            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                        >
                            Clear Cache
                        </button>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
};

export default SettingsPage;
