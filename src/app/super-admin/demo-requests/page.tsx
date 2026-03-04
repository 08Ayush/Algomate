'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CardLoader } from '@/components/ui/PageLoader';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
  X,
  Mail,
  Phone,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';

interface DemoRequest {
  id: string;
  institution: string;
  type: string;
  contact: string;
  designation?: string;
  email: string;
  phone: string;
  students: string;
  faculty: string;
  location: string;
  status: string;
  requested: string;
}

const DemoRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const userData = localStorage.getItem('user');
    if (!userData) return {};
    const authToken = Buffer.from(userData).toString('base64');
    return { 'Authorization': `Bearer ${authToken}` };
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/demo-requests', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.requests || []).map((r: any) => ({
          id: r.id,
          institution: r.institution_name,
          type: r.institution_type,
          contact: r.contact_name,
          designation: r.designation,
          email: r.email,
          phone: r.phone,
          students: r.student_count,
          faculty: r.faculty_count || 'N/A',
          location: `${r.city}, ${r.state}`,
          status: r.status || 'pending',
          requested: new Date(r.created_at).toLocaleDateString()
        }));
        setRequests(mapped);
      }
    } catch (error) {
      toast.error('Failed to fetch demo requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request: DemoRequest) => {
    setSelectedRequest(request);
    setSelectedStatus(request.status);
    setFollowUpNotes('');
    setShowViewModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedRequest) return;

    try {
      const res = await fetch(`/api/super-admin/demo-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          follow_up_notes: followUpNotes || undefined
        })
      });

      if (res.ok) {
        toast.success(`Status updated to ${selectedStatus}`);
        // Update local state
        setRequests(prev => prev.map(r =>
          r.id === selectedRequest.id ? { ...r, status: selectedStatus } : r
        ));
        setSelectedRequest({ ...selectedRequest, status: selectedStatus });
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update status');
      }
    } catch (e) {
      toast.error('Error updating status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'contacted': return 'bg-blue-100 text-blue-700';
      case 'demo_scheduled': return 'bg-purple-100 text-purple-700';
      case 'demo_completed': return 'bg-indigo-100 text-indigo-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'registered': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.contact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <SuperAdminLayout activeTab="demoRequests">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Demo Requests</h1>
            <p className="text-gray-600">Manage and respond to demo requests</p>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by institution or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="demo_scheduled">Demo Scheduled</option>
                <option value="demo_completed">Demo Completed</option>
                <option value="approved">Approved</option>
                <option value="registered">Registered</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Institution</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Requested</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-0"><CardLoader message="Loading requests..." subMessage="Fetching demo requests" /></td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No demo requests found</td></tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5A67D8]/10 flex items-center justify-center">
                          <Building2 size={20} className="text-[#5A67D8]" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{request.institution}</p>
                          <p className="text-sm text-gray-500">{request.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{request.contact}</p>
                      <p className="text-sm text-gray-500">{request.email}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{request.location}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                        {formatStatus(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{request.requested}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewRequest(request)}
                        className="p-2 text-[#4D869C] hover:bg-[#4D869C]/10 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* View Request Modal */}
        {showViewModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedRequest.institution}</h3>
                  <p className="text-sm text-gray-500">{selectedRequest.type}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedRequest.status)}`}>
                    {formatStatus(selectedRequest.status)}
                  </span>
                  <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6 text-xs text-gray-400">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 flex items-center gap-1">
                    <Clock size={12} /> Requested: {selectedRequest.requested}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  {/* Institution Details */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Building2 size={16} className="text-gray-400" /> Institution Details
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Type</p>
                        <p className="font-medium text-gray-900">{selectedRequest.type}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Students</p>
                        <p className="font-medium text-gray-900">{selectedRequest.students}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Faculty</p>
                        <p className="font-medium text-gray-900">{selectedRequest.faculty}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Location</p>
                        <p className="font-medium text-gray-900">{selectedRequest.location}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Person */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Users size={16} className="text-gray-400" /> Contact Person
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Name</p>
                        <p className="font-medium text-gray-900">{selectedRequest.contact}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Designation</p>
                        <p className="font-medium text-gray-900">{selectedRequest.designation || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Email</p>
                        <p className="font-medium text-blue-600">{selectedRequest.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Phone</p>
                        <p className="font-medium text-gray-900">{selectedRequest.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Update Status */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">Update Request</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#4D869C] outline-none"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="demo_scheduled">Demo Scheduled</option>
                        <option value="demo_completed">Demo Completed</option>
                        <option value="approved">Approved</option>
                        <option value="registered">Registered</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Follow-up Notes</label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#4D869C] outline-none resize-none h-20"
                        placeholder="Add notes about your interaction..."
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={handleUpdateStatus}
                      className="w-full py-2.5 bg-[#5A67D8] text-white font-bold rounded-lg shadow hover:bg-[#4C51BF] transition-all text-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <a href={`mailto:${selectedRequest.email}`} className="flex-1 py-2.5 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition-colors font-medium text-sm">
                    <Mail size={18} /> Email
                  </a>
                  <a href={`tel:${selectedRequest.phone}`} className="flex-1 py-2.5 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition-colors font-medium text-sm">
                    <Phone size={18} /> Call
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default DemoRequestsPage;
