'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MapPin, Search, RefreshCw, Users, Monitor, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

interface Classroom {
  id: string;
  name: string;
  room_number: string;
  capacity: number;
  type: string;
  has_projector?: boolean;
  has_ac?: boolean;
  building?: string;
  floor?: number;
  is_available: boolean;
}

const ClassroomsPage: React.FC = () => {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { fetchClassrooms(); }, []);

  const getAuthHeaders = () => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/login'); return null; }
    return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
  };

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) return;
      const user = JSON.parse(userData);
      const headers = getAuthHeaders();
      if (!headers) return;

      const q = user.college_id ? `?college_id=${user.college_id}` : '';
      const res = await fetch(`/api/classrooms${q}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data.classrooms || data.data || []);
      }
    } catch { toast.error('Error loading classrooms'); } finally { setLoading(false); }
  };

  const uniqueTypes = [...new Set(classrooms.map(c => c.type).filter(Boolean))];

  const filteredClassrooms = classrooms.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.room_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'lecture_hall': 'bg-blue-100 text-blue-700',
      'lab': 'bg-green-100 text-green-700',
      'seminar': 'bg-purple-100 text-purple-700',
      'workshop': 'bg-orange-100 text-orange-700',
    };
    return colors[type?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  return (
    <FacultyCreatorLayout activeTab="classrooms">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Classrooms</h1>
            <p className="text-gray-600">View available classrooms and labs</p>
          </div>
          <button onClick={fetchClassrooms} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search classrooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl min-w-[150px]"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100"><MapPin size={24} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{classrooms.length}</p><p className="text-sm text-gray-500">Total Rooms</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100"><Users size={24} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{classrooms.reduce((sum, c) => sum + (c.capacity || 0), 0)}</p><p className="text-sm text-gray-500">Total Capacity</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100"><Monitor size={24} className="text-purple-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{classrooms.filter(c => c.has_projector).length}</p><p className="text-sm text-gray-500">With Projector</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100"><Building size={24} className="text-orange-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{classrooms.filter(c => c.is_available).length}</p><p className="text-sm text-gray-500">Available</p></div>
          </div>
        </div>

        {/* Classrooms Grid */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredClassrooms.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MapPin size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No classrooms found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredClassrooms.map((room, i) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <MapPin size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{room.name || room.room_number}</h3>
                        <p className="text-sm text-gray-500">{room.room_number}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${room.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {room.is_available ? 'Available' : 'Occupied'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Capacity</span>
                      <span className="font-medium text-gray-900">{room.capacity} seats</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getTypeColor(room.type)}`}>
                        {room.type || 'N/A'}
                      </span>
                    </div>
                    {room.building && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Building</span>
                        <span className="text-gray-900">{room.building}</span>
                      </div>
                    )}
                    {room.floor !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Floor</span>
                        <span className="text-gray-900">{room.floor}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    {room.has_projector && (
                      <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs">Projector</span>
                    )}
                    {room.has_ac && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">AC</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FacultyCreatorLayout>
  );
};

export default ClassroomsPage;
