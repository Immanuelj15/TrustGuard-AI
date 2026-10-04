import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Case } from '../types';
import {
  FolderLock,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  X,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

const COMPLAINT_CATEGORIES = [
  'All Categories',
  'Authority Impersonation & Digital Arrest',
  'Voice Cloning Fraud',
  'Deepfake Extortion',
  'Phishing / Smishing Scam',
  'Crypto / Investment Fraud',
  'Banking OTP Theft',
  'Malicious APK / Device Takeover'
];

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('new') === 'true');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(COMPLAINT_CATEGORIES[1]);
  const [newPriority, setNewPriority] = useState('medium');
  const [newDesc, setNewDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (categoryFilter !== 'all' && categoryFilter !== 'All Categories') params.append('category', categoryFilter);

      const res = await apiClient.get<Case[]>(`/cases?${params.toString()}`);
      setCases(res.data);
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await apiClient.post<Case>('/cases', {
        title: newTitle.trim(),
        complaint_category: newCategory,
        priority: newPriority,
        description: newDesc.trim() || undefined,
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      navigate(`/cases/${res.data.id}`);
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create case');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#17223b]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-cyan-400" />
            <span>Cybercrime Case Management</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            DIGITAL EVIDENCE REPOSITORY & ACTIVE INVESTIGATION REGISTRY
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-md shadow-cyan-950"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Case</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#0c1222] border border-[#17223b] flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search Title, Case ID, Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="awaiting_review">Awaiting Review</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono max-w-[200px]"
          >
            {COMPLAINT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="p-4 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-16">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <h3 className="text-sm font-medium text-slate-300">No matching investigation cases</h3>
            <p className="text-xs text-slate-500 mt-1">Try modifying filter criteria or create a new case file.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b14] text-slate-400 uppercase font-mono border-b border-[#17223b]">
                <tr>
                  <th className="py-3 px-4">Case Number</th>
                  <th className="py-3 px-4">Title & Complaint Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Evidence Vault</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17223b]/60">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-[#11192e]/60 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-cyan-400">
                      {c.case_number}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-100 truncate">{c.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{c.complaint_category}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                        c.priority === 'critical' ? 'bg-red-950 text-red-400 border border-red-800' :
                        c.priority === 'high' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                        c.priority === 'medium' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {c.status.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {c.evidence_count || 0} items
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/cases/${c.id}`)}
                        className="px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition inline-flex items-center gap-1.5"
                      >
                        <span>Open File</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0c1222] border border-[#17223b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#17223b]">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <span>Register New Cybercrime Investigation Case</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">CASE TITLE *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CBI Impersonation & Digital Arrest Scam"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">COMPLAINT CATEGORY *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    {COMPLAINT_CATEGORIES.slice(1).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">INVESTIGATION PRIORITY *</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">INCIDENT SUMMARY / COMPLAINANT STATEMENT</label>
                <textarea
                  rows={3}
                  placeholder="Briefly state incident facts, monetary loss amount, suspect phone number or contact channel..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#17223b]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#11192e] text-slate-400 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-2"
                >
                  {createLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span>Create Case Record</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
