'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Key, Copy, CheckCircle, XCircle, Clock, Building2, 
  RefreshCw, ArrowLeft, Send, Plus, Search, Trash2, ExternalLink
} from 'lucide-react';

interface RegistrationToken {
  id: string;
  token: string;
  demo_request_id?: string;
  institution_name?: string;
  email?: string;
  expires_at: string;
  is_used: boolean;
  used_at?: string;
  college_id?: string;
  created_by?: string;
  created_at: string;
  demo_request?: {
    institution_name: string;
    contact_name: string;
    email: string;
    phone: string;
  };
}

interface DemoRequest {
  id: string;
  institution_name: string;
  contact_name: string;
  email: string;
  status: string;
}

export default function RegistrationTokensPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  
  // Generate token form
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    demoRequestId: '',
    institutionName: '',
    email: '',
    expiresInDays: 7
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

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tokens and approved requests in parallel
      const [tokensRes, requestsRes] = await Promise.all([
        fetch('/api/super-admin/registration-tokens'),
        fetch('/api/super-admin/demo-requests?status=approved')
      ]);

      if (tokensRes.ok) {
        const data = await tokensRes.json();
        setTokens(data.tokens || []);
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        // Filter only approved/demo_completed requests that don't have tokens yet
        setApprovedRequests(
          (data.requests || []).filter((r: DemoRequest) => 
            r.status === 'approved' || r.status === 'demo_completed'
          )
        );
      }
    } catch (err: any) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/college/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demoRequestId: generateForm.demoRequestId || undefined,
          institutionName: generateForm.institutionName,
          email: generateForm.email,
          expiresInDays: generateForm.expiresInDays
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate token');
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(data.registrationUrl);
      setSuccessMessage(`Token generated successfully!\n\nRegistration URL (copied to clipboard):\n${data.registrationUrl}\n\nExpires: ${new Date(data.expiresAt).toLocaleString()}`);
      
      setShowGenerateForm(false);
      setGenerateForm({
        demoRequestId: '',
        institutionName: '',
        email: '',
        expiresInDays: 7
      });
      
      fetchData();
      setTimeout(() => setSuccessMessage(''), 10000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleCopyToken = async (token: RegistrationToken) => {
    const registrationUrl = `${window.location.origin}/college/register?token=${token.token}`;
    await navigator.clipboard.writeText(registrationUrl);
    setCopiedToken(token.id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token?')) return;

    try {
      const response = await fetch(`/api/super-admin/registration-tokens/${tokenId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete token');
      }

      setSuccessMessage('Token deleted successfully');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleSendEmail = async (token: RegistrationToken) => {
    if (!token.email) {
      setError('No email address associated with this token');
      return;
    }

    const registrationUrl = `${window.location.origin}/college/register?token=${token.token}`;
    const subject = encodeURIComponent('Your Academic Compass Registration Link');
    const body = encodeURIComponent(
      `Dear ${token.institution_name || 'Institution'},\n\n` +
      `Your registration link for Academic Compass ERP is ready!\n\n` +
      `Registration URL: ${registrationUrl}\n\n` +
      `This link will expire on: ${new Date(token.expires_at).toLocaleString()}\n\n` +
      `Please complete your registration before the link expires.\n\n` +
      `Best regards,\nAcademic Compass Team`
    );
    
    window.open(`mailto:${token.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const getTokenStatus = (token: RegistrationToken): 'active' | 'used' | 'expired' => {
    if (token.is_used) return 'used';
    if (new Date(token.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  const getStatusBadge = (status: 'active' | 'used' | 'expired') => {
    const config = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      used: { label: 'Used', color: 'bg-blue-100 text-blue-800', icon: Building2 },
      expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: Clock },
    };
    const { label, color, icon: Icon } = config[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  // Filter tokens
  const filteredTokens = tokens.filter(token => {
    const status = getTokenStatus(token);
    
    // Status filter
    if (filterStatus !== 'all' && status !== filterStatus) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        token.institution_name?.toLowerCase().includes(query) ||
        token.email?.toLowerCase().includes(query) ||
        token.token.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Stats
  const stats = {
    total: tokens.length,
    active: tokens.filter(t => getTokenStatus(t) === 'active').length,
    used: tokens.filter(t => getTokenStatus(t) === 'used').length,
    expired: tokens.filter(t => getTokenStatus(t) === 'expired').length,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-600">Loading tokens...</p>
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
                <h1 className="text-xl font-bold text-gray-900">Registration Tokens</h1>
                <p className="text-sm text-gray-500">Generate and manage college registration tokens</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowGenerateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Generate Token
              </button>
            </div>
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
                <Key className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Tokens</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.used}</p>
                <p className="text-sm text-gray-500">Used</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
                <p className="text-sm text-gray-500">Expired</p>
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
                placeholder="Search by institution, email, or token..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex gap-2">
              {(['all', 'active', 'used', 'expired'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tokens Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Institution</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Token</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Expires</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      {tokens.length === 0 ? 'No tokens generated yet' : 'No tokens match your filters'}
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map((token) => {
                    const status = getTokenStatus(token);
                    return (
                      <tr key={token.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{token.institution_name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{token.email || 'No email'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {token.token.substring(0, 12)}...
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(status)}
                        </td>
                        <td className="px-4 py-3">
                          <p className={`text-sm ${status === 'expired' ? 'text-red-600' : 'text-gray-600'}`}>
                            {formatDate(token.expires_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{formatDate(token.created_at)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyToken(token)}
                              className={`p-2 rounded-lg transition-colors ${
                                copiedToken === token.id
                                  ? 'bg-green-100 text-green-600'
                                  : 'hover:bg-gray-100 text-gray-600'
                              }`}
                              title="Copy Registration URL"
                              disabled={status !== 'active'}
                            >
                              {copiedToken === token.id ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            {status === 'active' && token.email && (
                              <button
                                onClick={() => handleSendEmail(token)}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Send via Email"
                              >
                                <Send className="w-4 h-4 text-blue-600" />
                              </button>
                            )}
                            {status !== 'used' && (
                              <button
                                onClick={() => handleDeleteToken(token.id)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete Token"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
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
        </div>
      </main>

      {/* Generate Token Modal */}
      {showGenerateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Generate Registration Token</h2>
                <button
                  onClick={() => setShowGenerateForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleGenerateToken} className="p-6 space-y-4">
              {/* Link to Demo Request */}
              {approvedRequests.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link to Demo Request (Optional)
                  </label>
                  <select
                    value={generateForm.demoRequestId}
                    onChange={(e) => {
                      const request = approvedRequests.find(r => r.id === e.target.value);
                      setGenerateForm({
                        ...generateForm,
                        demoRequestId: e.target.value,
                        institutionName: request?.institution_name || generateForm.institutionName,
                        email: request?.email || generateForm.email
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select a demo request --</option>
                    {approvedRequests.map(request => (
                      <option key={request.id} value={request.id}>
                        {request.institution_name} - {request.contact_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institution Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={generateForm.institutionName}
                  onChange={(e) => setGenerateForm({...generateForm, institutionName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., ABC College of Engineering"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={generateForm.email}
                  onChange={(e) => setGenerateForm({...generateForm, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="admin@college.edu"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token Validity (Days)
                </label>
                <select
                  value={generateForm.expiresInDays}
                  onChange={(e) => setGenerateForm({...generateForm, expiresInDays: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> After generating, you'll get a unique registration URL that can be sent to the institution.
                  The token can only be used once.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Generate Token
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateForm(false)}
                  className="px-6 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
