'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, Filter, Calendar, Mail, Phone, Building2, Users, 
  Clock, CheckCircle, XCircle, Send, Eye, ChevronDown, 
  RefreshCw, ArrowLeft, MessageSquare, ExternalLink
} from 'lucide-react';

interface DemoRequest {
  id: string;
  institution_name: string;
  institution_type: string;
  website?: string;
  student_count: string;
  faculty_count?: string;
  contact_name: string;
  designation?: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  current_system?: string;
  challenges?: string[];
  preferred_date?: string;
  preferred_time?: string;
  additional_notes?: string;
  status: 'pending' | 'contacted' | 'demo_scheduled' | 'demo_completed' | 'approved' | 'registered' | 'rejected';
  demo_scheduled_at?: string;
  demo_completed_at?: string;
  follow_up_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-800', icon: MessageSquare },
  demo_scheduled: { label: 'Demo Scheduled', color: 'bg-purple-100 text-purple-800', icon: Calendar },
  demo_completed: { label: 'Demo Completed', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  registered: { label: 'Registered', color: 'bg-emerald-100 text-emerald-800', icon: Building2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const institutionTypes = [
  'University', 'College', 'School', 'Polytechnic', 'ITI', 
  'Management Institute', 'Engineering College', 'Medical College', 'Other'
];

export default function DemoRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Selected request for detail view
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Update form
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    demo_scheduled_at: '',
    follow_up_notes: '',
    rejection_reason: ''
  });

  useEffect(() => {
    // Check if user is super admin
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'super_admin') {
      router.push('/login?message=Access denied. Super admin only.');
      return;
    }

    fetchDemoRequests();
  }, [router]);

  // Filter requests when filters change
  useEffect(() => {
    let filtered = [...requests];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.institution_name.toLowerCase().includes(query) ||
        r.contact_name.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        r.city.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.institution_type === typeFilter);
    }
    
    setFilteredRequests(filtered);
  }, [requests, searchQuery, statusFilter, typeFilter]);

  const fetchDemoRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/demo-requests');
      
      if (!response.ok) {
        throw new Error('Failed to fetch demo requests');
      }
      
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      const response = await fetch(`/api/super-admin/demo-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update request');
      }

      setSuccessMessage('Demo request updated successfully');
      setShowUpdateForm(false);
      setShowDetailModal(false);
      fetchDemoRequests();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleGenerateToken = async (request: DemoRequest) => {
    try {
      const response = await fetch('/api/college/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demoRequestId: request.id,
          email: request.email,
          institutionName: request.institution_name,
          expiresInDays: 7
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate token');
      }

      // Copy registration URL to clipboard
      await navigator.clipboard.writeText(data.registrationUrl);
      setSuccessMessage(`Token generated! Registration URL copied to clipboard.\n\nURL: ${data.registrationUrl}\n\nExpires: ${new Date(data.expiresAt).toLocaleString()}`);
      
      // Update status to approved
      await fetch(`/api/super-admin/demo-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      
      fetchDemoRequests();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const openDetailModal = (request: DemoRequest) => {
    setSelectedRequest(request);
    setUpdateForm({
      status: request.status,
      demo_scheduled_at: request.demo_scheduled_at ? new Date(request.demo_scheduled_at).toISOString().slice(0, 16) : '',
      follow_up_notes: request.follow_up_notes || '',
      rejection_reason: request.rejection_reason || ''
    });
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: DemoRequest['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    scheduled: requests.filter(r => r.status === 'demo_scheduled').length,
    approved: requests.filter(r => r.status === 'approved' || r.status === 'registered').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-600">Loading demo requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/super-admin/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Demo Requests</h1>
                <p className="text-sm text-gray-500">Manage institution demo requests</p>
              </div>
            </div>
            <button
              onClick={fetchDemoRequests}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 whitespace-pre-line">
            {successMessage}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
                <p className="text-sm text-gray-500">Demos Scheduled</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by institution, contact, email, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="all">All Status</option>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="all">All Types</option>
                {institutionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Institution</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Requested</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      {requests.length === 0 ? 'No demo requests yet' : 'No requests match your filters'}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{request.institution_name}</p>
                          <p className="text-sm text-gray-500">{request.institution_type}</p>
                          <p className="text-xs text-gray-400">{request.student_count} students</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{request.contact_name}</p>
                          <p className="text-sm text-gray-500">{request.email}</p>
                          <p className="text-sm text-gray-500">{request.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{request.city}</p>
                        <p className="text-sm text-gray-500">{request.state}</p>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{formatDate(request.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetailModal(request)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          {(request.status === 'demo_completed' || request.status === 'approved') && (
                            <button
                              onClick={() => handleGenerateToken(request)}
                              className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                              title="Generate Registration Token"
                            >
                              <Send className="w-4 h-4 text-indigo-600" />
                            </button>
                          )}
                          <a
                            href={`mailto:${request.email}`}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4 text-blue-600" />
                          </a>
                          <a
                            href={`tel:${request.phone}`}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Call"
                          >
                            <Phone className="w-4 h-4 text-green-600" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedRequest.institution_name}</h2>
                  <p className="text-sm text-gray-500">{selectedRequest.institution_type}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedRequest.status)}
                <p className="text-sm text-gray-500">Requested: {formatDate(selectedRequest.created_at)}</p>
              </div>

              {/* Institution Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Institution Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Type:</span> {selectedRequest.institution_type}</p>
                    <p><span className="text-gray-500">Students:</span> {selectedRequest.student_count}</p>
                    {selectedRequest.faculty_count && (
                      <p><span className="text-gray-500">Faculty:</span> {selectedRequest.faculty_count}</p>
                    )}
                    {selectedRequest.website && (
                      <p>
                        <span className="text-gray-500">Website:</span>{' '}
                        <a href={selectedRequest.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                          {selectedRequest.website} <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    )}
                    <p><span className="text-gray-500">Location:</span> {selectedRequest.city}, {selectedRequest.state}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Contact Person
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Name:</span> {selectedRequest.contact_name}</p>
                    {selectedRequest.designation && (
                      <p><span className="text-gray-500">Designation:</span> {selectedRequest.designation}</p>
                    )}
                    <p><span className="text-gray-500">Email:</span> {selectedRequest.email}</p>
                    <p><span className="text-gray-500">Phone:</span> {selectedRequest.phone}</p>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              {(selectedRequest.current_system || selectedRequest.challenges?.length) && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Requirements</h3>
                  {selectedRequest.current_system && (
                    <p className="text-sm"><span className="text-gray-500">Current System:</span> {selectedRequest.current_system}</p>
                  )}
                  {selectedRequest.challenges && selectedRequest.challenges.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Challenges:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.challenges.map((challenge, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {challenge}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preferred Demo Time */}
              {(selectedRequest.preferred_date || selectedRequest.preferred_time) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Preferred Demo Time</h3>
                  <p className="text-sm">
                    {selectedRequest.preferred_date && new Date(selectedRequest.preferred_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {selectedRequest.preferred_time && ` at ${selectedRequest.preferred_time}`}
                  </p>
                </div>
              )}

              {/* Additional Notes */}
              {selectedRequest.additional_notes && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Additional Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedRequest.additional_notes}</p>
                </div>
              )}

              {/* Follow-up Notes */}
              {selectedRequest.follow_up_notes && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Follow-up Notes</h3>
                  <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">{selectedRequest.follow_up_notes}</p>
                </div>
              )}

              {/* Update Form */}
              {!showUpdateForm ? (
                <button
                  onClick={() => setShowUpdateForm(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  Update Status
                </button>
              ) : (
                <form onSubmit={handleUpdateRequest} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900">Update Request</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(statusConfig).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {updateForm.status === 'demo_scheduled' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Demo Scheduled At</label>
                      <input
                        type="datetime-local"
                        value={updateForm.demo_scheduled_at}
                        onChange={(e) => setUpdateForm({...updateForm, demo_scheduled_at: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {updateForm.status === 'rejected' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                      <textarea
                        value={updateForm.rejection_reason}
                        onChange={(e) => setUpdateForm({...updateForm, rejection_reason: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Why was this request rejected?"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Notes</label>
                    <textarea
                      value={updateForm.follow_up_notes}
                      onChange={(e) => setUpdateForm({...updateForm, follow_up_notes: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Add notes about your interaction..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUpdateForm(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {(selectedRequest.status === 'demo_completed' || selectedRequest.status === 'approved') && (
                  <button
                    onClick={() => handleGenerateToken(selectedRequest)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Generate Registration Token
                  </button>
                )}
                <a
                  href={`mailto:${selectedRequest.email}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
                <a
                  href={`tel:${selectedRequest.phone}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
