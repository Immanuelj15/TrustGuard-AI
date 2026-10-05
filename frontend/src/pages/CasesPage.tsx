import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { Case, IOCItem, IOCCorrelation, CorrelationGraphData } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { IOCTableAndCorrelation } from '../components/investigation/IOCTableAndCorrelation';
import { CorrelationGraphComponent } from '../components/investigation/CorrelationGraphComponent';
import {
  FolderLock,
  PlusCircle,
  Search,
  ArrowRight,
  X,
  FileSpreadsheet,
  AlertCircle,
  Binary,
  Network,
  Eye,
  Tag,
  Filter
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
  const { isAdmin, isInvestigator, isReviewer, isDemo } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Sub-Navigation Tab: 'cases' | 'iocs' | 'correlations'
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'iocs' ? 'iocs' : (tabParam === 'correlations' || searchParams.get('view') === 'correlations') ? 'correlations' : 'cases';

  // Selected case for IOC Explorer & Correlation Graph
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // IOC state
  const [caseIOCs, setCaseIOCs] = useState<IOCItem[]>([]);
  const [caseCorrelations, setCaseCorrelations] = useState<any>([]);
  const [iocsLoading, setIocsLoading] = useState(false);

  // Correlation Graph state
  const [graphData, setGraphData] = useState<CorrelationGraphData>({ nodes: [], edges: [], total_nodes: 0, total_edges: 0 });
  const [graphLoading, setGraphLoading] = useState(false);

  // Cases List Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('new') === 'true' && (isAdmin || isInvestigator));
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
      if (res.data.length > 0 && !selectedCaseId) {
        setSelectedCaseId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, priorityFilter, categoryFilter]);

  // Load IOCs when on IOC tab and case is selected
  useEffect(() => {
    if (!selectedCaseId || activeTab !== 'iocs') return;
    const fetchIOCs = async () => {
      setIocsLoading(true);
      try {
        const [iocsRes, corrRes] = await Promise.all([
          apiClient.get<IOCItem[]>(`/cases/${selectedCaseId}/iocs`),
          apiClient.get<any>(`/cases/${selectedCaseId}/correlations`),
        ]);
        setCaseIOCs(Array.isArray(iocsRes.data) ? iocsRes.data : []);
        setCaseCorrelations(corrRes.data);
      } catch (err) {
        console.error('Failed to load IOCs', err);
      } finally {
        setIocsLoading(false);
      }
    };
    fetchIOCs();
  }, [selectedCaseId, activeTab]);

  // Load Graph when on Correlations tab and case is selected
  useEffect(() => {
    if (!selectedCaseId || activeTab !== 'correlations') return;
    const fetchGraph = async () => {
      setGraphLoading(true);
      try {
        const res = await apiClient.get<CorrelationGraphData>(`/cases/${selectedCaseId}/correlation-graph`);
        setGraphData(res.data);
      } catch (err) {
        console.error('Failed to load correlation graph', err);
      } finally {
        setGraphLoading(false);
      }
    };
    fetchGraph();
  }, [selectedCaseId, activeTab]);

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
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/cases')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'cases'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <FolderLock className="w-4 h-4" />
          <span>My Cases ({cases.length})</span>
        </button>

        <button
          onClick={() => navigate('/cases?tab=iocs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'iocs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <Binary className="w-4 h-4" />
          <span>IOC Explorer</span>
        </button>

        <button
          onClick={() => navigate('/cases?tab=correlations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'correlations'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Evidence Correlation</span>
        </button>
      </div>

      {/* VIEW 1: MY CASES DIRECTORY */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                <FolderLock className="w-6 h-6 text-blue-600" />
                <span>
                  {isReviewer ? 'Case Oversight & Review Registry' : 'Case Management Registry'}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isReviewer
                  ? 'Assigned cybercrime investigations awaiting peer review, chain of custody validation, and audit sign-off.'
                  : 'Digital evidence repository, case chronology, and official cyber investigation registry.'}
              </p>
            </div>

            {/* Role-Specific Action Controls */}
            {isAdmin || (isInvestigator && !isDemo) ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition self-start sm:self-auto cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register New Case</span>
              </button>
            ) : isReviewer ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFilter(statusFilter === 'awaiting_review' ? 'all' : 'awaiting_review')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer ${
                    statusFilter === 'awaiting_review'
                      ? 'bg-teal-700 text-white'
                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>{statusFilter === 'awaiting_review' ? 'Showing Review Queue' : 'Filter Review Queue'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  SYNTHETIC CASE REPOSITORY (DEMO)
                </span>
              </div>
            )}
          </div>

          {/* Filter and Search Bar */}
          <div className="surface-card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Title, ID, or Keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="awaiting_review">Awaiting Review</option>
                <option value="resolved">Resolved</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition max-w-[220px]"
              >
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cases Table */}
          <div className="surface-card overflow-hidden">
            {loading ? (
              <div className="py-20">
                <LoadingState message="Querying case registry..." />
              </div>
            ) : cases.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  icon={FileSpreadsheet}
                  title="No matching investigation cases"
                  message="No incident records match the active search or filter parameters."
                  actionLabel="Reset Filters"
                  onAction={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setCategoryFilter('all');
                  }}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Case Number</th>
                      <th className="py-3 px-4">Title & Complaint Category</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4">Evidence Vault</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition group">
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                          {c.case_number}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition truncate">
                            {c.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{c.complaint_category}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="priority" value={c.priority} />
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="status" value={c.status} />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {c.evidence_count || 0} items
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => navigate(`/cases/${c.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
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
        </div>
      )}

      {/* VIEW 2: IOC EXPLORER */}
      {activeTab === 'iocs' && (
        <div className="space-y-6">
          <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                <Binary className="w-6 h-6 text-blue-600" />
                <span>Indicators of Compromise (IOC) Explorer</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Automated regex and linguistic extraction of phone numbers, domains, URLs, crypto addresses, and UPI IDs.
              </p>
            </div>

            {/* Case Selector Dropdown */}
            {cases.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase text-[10px]">Case:</span>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number} — {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <IOCTableAndCorrelation
            iocs={caseIOCs}
            correlations={caseCorrelations}
            loading={iocsLoading}
            onSelectEvidence={(evidenceId) => navigate(`/analysis?evidence_id=${evidenceId}`)}
          />
        </div>
      )}

      {/* VIEW 3: EVIDENCE CORRELATION GRAPH */}
      {activeTab === 'correlations' && (
        <div className="space-y-6">
          <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                <Network className="w-6 h-6 text-blue-600" />
                <span>Evidence Correlation & Threat Graph</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Interactive relational graph linking cases, ingested media files, extracted telephone numbers, domains, and IOCs.
              </p>
            </div>

            {/* Case Selector Dropdown */}
            {cases.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase text-[10px]">Target Case:</span>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number} — {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <CorrelationGraphComponent
            graphData={graphData}
            loading={graphLoading}
            onSelectNode={(node) => {
              if (node.type === 'evidence') {
                navigate(`/analysis?evidence_id=${node.id}`);
              }
            }}
          />
        </div>
      )}

      {/* Create Case Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                  <span>Register New Cybercrime Investigation Case</span>
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCase} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    CASE TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CBI Impersonation & Digital Arrest Scam"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      COMPLAINT CATEGORY *
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    >
                      {COMPLAINT_CATEGORIES.slice(1).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      INVESTIGATION PRIORITY *
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    INCIDENT SUMMARY / COMPLAINANT STATEMENT
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Briefly state incident facts, monetary loss amount, suspect phone number or contact channel..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {createLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Create Case Record</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
