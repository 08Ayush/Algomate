'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Search,
  X,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface RegistrationToken {
  id: string;
  token: string;
  institutionName: string;
  email: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  createdAt: string;
}

const RegistrationTokensPage: React.FC = () => {
  const { showConfirm } = useConfirm();
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [newToken, setNewToken] = useState({
    institution_name: '',
    email: '',
    expires_in_days: 30
  });

  useEffect(() => {
    fetchTokens();
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const userData = localStorage.getItem('user');
    if (!userData) return {};
    const authToken = Buffer.from(userData).toString('base64');
    return { 'Authorization': `Bearer ${authToken}` };
  };

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/registration-tokens', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.tokens || []).map((t: any) => ({
          id: t.id,
          token: t.token,
          institutionName: t.institution_name || t.demo_request?.institution_name || 'Unknown',
          email: t.email || t.demo_request?.email || 'N/A',
          expiresAt: t.expires_at,
          isUsed: t.is_used,
          usedAt: t.used_at,
          createdAt: t.created_at
        }));
        setTokens(mapped);
      }
    } catch (error) {
      toast.error('Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!newToken.institution_name || !newToken.email) {
      toast.error('Institution name and email are required');
      return;
    }

    try {
      const res = await fetch('/api/super-admin/registration-tokens', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newToken)
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Token generated successfully');
        setShowGenerateModal(false);
        setNewToken({ institution_name: '', email: '', expires_in_days: 30 });
        fetchTokens();

        // Copy the token to clipboard
        if (data.token?.token) {
          navigator.clipboard.writeText(data.token.token);
          toast.success('Token copied to clipboard');
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to generate token');
      }
    } catch (e) {
      toast.error('Error generating token');
    }
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      toast.success('Token copied to clipboard');
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (e) {
      toast.error('Failed to copy token');
    }
  };

  const handleDeleteToken = (token: RegistrationToken) => {
    showConfirm({
      title: 'Delete Registration Token',
      message: `Are you sure you want to delete the token for "${token.institutionName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/super-admin/registration-tokens/${token.id}`, { method: 'DELETE', headers: getAuthHeaders() });
          if (res.ok) {
            toast.success('Token deleted');
            fetchTokens();
          } else {
            const err = await res.json();
            toast.error(err.error || 'Failed to delete token');
          }
        } catch (e) {
          toast.error('Error deleting token');
        }
      }
    });
  };

  const handleReactivateToken = async (id: string) => {
    try {
      const res = await fetch(`/api/super-admin/registration-tokens/${id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate', expiresInDays: 7 })
      });

      if (res.ok) {
        toast.success('Token reactivated');
        fetchTokens();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to reactivate token');
      }
    } catch (e) {
      toast.error('Error reactivating token');
    }
  };

  const getTokenStatus = (token: RegistrationToken): 'active' | 'used' | 'expired' => {
    if (token.isUsed) return 'used';
    if (new Date(token.expiresAt) < new Date()) return 'expired';
    return 'active';
  };

  const getStatusColor = (status: 'active' | 'used' | 'expired') => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'used': return 'bg-blue-100 text-blue-700';
      case 'expired': return 'bg-red-100 text-red-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredTokens = tokens.filter(t => {
    const matchesSearch = t.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.token.toLowerCase().includes(searchTerm.toLowerCase());

    const status = getTokenStatus(t);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <SuperAdminLayout activeTab="registrationTokens">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Registration Tokens</h1>
            <p className="text-gray-600">Generate and manage registration tokens for new colleges</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <Plus size={16} />
            Generate Token
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by institution, email, or token..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
              <option value="expired">Expired</option>
            </select>
            <button
              onClick={fetchTokens}
              className="px-5 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tokens Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Token</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Institution</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : filteredTokens.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No tokens found</td></tr>
              ) : (
                filteredTokens.map((token) => {
                  const status = getTokenStatus(token);
                  return (
                    <tr key={token.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-[#ED8936]/10 flex items-center justify-center">
                            <Key size={20} className="text-[#ED8936]" />
                          </div>
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded max-w-[150px] truncate">
                            {token.token}
                          </span>
                          <button
                            onClick={() => handleCopyToken(token.token)}
                            className="p-1.5 text-gray-400 hover:text-[#4D869C] hover:bg-[#4D869C]/10 rounded transition-colors"
                          >
                            {copiedToken === token.token ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{token.institutionName}</td>
                      <td className="px-6 py-4 text-gray-600">{token.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock size={14} className="text-gray-400" />
                          {formatDate(token.expiresAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {status === 'expired' || status === 'used' ? (
                            <button
                              onClick={() => handleReactivateToken(token.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Reactivate"
                            >
                              <RefreshCw size={16} />
                            </button>
                          ) : (
                            <a
                              href={`mailto:${token.email}?subject=Your Registration Token&body=Here is your registration token: ${token.token}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Send via Email"
                            >
                              <Send size={16} />
                            </a>
                          )}
                          {!token.isUsed && (
                            <button
                              onClick={() => handleDeleteToken(token)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Generate Token Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Key size={20} className="text-[#ED8936]" />
                  Generate Registration Token
                </h3>
                <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name *</label>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                    placeholder="Enter institution name"
                    value={newToken.institution_name}
                    onChange={(e) => setNewToken({ ...newToken, institution_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                    placeholder="admin@institution.edu"
                    value={newToken.email}
                    onChange={(e) => setNewToken({ ...newToken, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires In (Days)</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                    value={newToken.expires_in_days}
                    onChange={(e) => setNewToken({ ...newToken, expires_in_days: parseInt(e.target.value) })}
                  >
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateToken}
                  className="px-8 py-2.5 bg-[#ED8936] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Generate Token
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default RegistrationTokensPage;
