import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import {
  Case,
  CaseDetail,
  EvidenceItem,
  TimelineEvent,
  IOCItem,
  IOCCorrelation,
  CorrelationGraphData,
  EvidenceSimilarity,
  InvestigatorNote,
} from '../types';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { IOCTableAndCorrelation } from '../components/investigation/IOCTableAndCorrelation';
import { CorrelationGraphComponent } from '../components/investigation/CorrelationGraphComponent';
import { EvidenceTimelineComponent } from '../components/investigation/EvidenceTimelineComponent';
import { EvidenceIntegrityComponent } from '../components/investigation/EvidenceIntegrityComponent';
import { EvidenceSimilarityComponent } from '../components/investigation/EvidenceSimilarityComponent';
import { InvestigatorNotesComponent } from '../components/investigation/InvestigatorNotesComponent';
import { InvestigatorCopilotComponent } from '../components/investigation/InvestigatorCopilotComponent';
import { SyntheticGalleryModal } from '../components/common/SyntheticGalleryModal';
import { ModelEvaluationModal } from '../components/investigation/ModelEvaluationModal';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Upload,
  FileText,
  Clock,
  Network,
  Cpu,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  MessageSquare,
  Bot,
  Copy,
  Check,
  X,
  AlertCircle,
  FileCheck2,
  FileCode,
  FileAudio,
  FileVideo,
  File,
  ChevronDown,
  Download,
  FolderLock
} from 'lucide-react';

type TabType = 'evidence' | 'timeline' | 'iocs' | 'graph' | 'similarity' | 'notes' | 'copilot';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isInvestigator, isReviewer, isDemo } = useAuth();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('evidence');

  // Sub-data states
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [caseIOCs, setCaseIOCs] = useState<IOCItem[]>([]);
  const [caseCorrelations, setCaseCorrelations] = useState<any>([]);
  const [iocsLoading, setIocsLoading] = useState(false);

  const [graphData, setGraphData] = useState<CorrelationGraphData>({
    nodes: [],
    edges: [],
    total_nodes: 0,
    total_edges: 0,
  });
  const [graphLoading, setGraphLoading] = useState(false);

  const [similarities, setSimilarities] = useState<EvidenceSimilarity[]>([]);
  const [similarityLoading, setSimilarityLoading] = useState(false);

  // Modals & UI Controls
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedIntegrityId, setExpandedIntegrityId] = useState<string | null>(null);

  const fetchCaseDetail = async () => {
    if (!id) return;
    try {
      const res = await apiClient.get<CaseDetail>(`/cases/${id}`);
      setCaseData(res.data);
    } catch (err) {
      console.error('Failed to load case detail', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    if (!id) return;
    setTimelineLoading(true);
    try {
      const res = await apiClient.get<TimelineEvent[]>(`/cases/${id}/timeline`);
      setTimelineEvents(res.data);
    } catch (err) {
      console.error('Failed to load timeline', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const fetchIOCsAndCorrelations = async () => {
    if (!id) return;
    setIocsLoading(true);
    try {
      const [iocsRes, corrRes] = await Promise.all([
        apiClient.get<IOCItem[]>(`/cases/${id}/iocs`),
        apiClient.get<any>(`/cases/${id}/correlations`),
      ]);
      setCaseIOCs(Array.isArray(iocsRes.data) ? iocsRes.data : []);
      setCaseCorrelations(corrRes.data);
    } catch (err) {
      console.error('Failed to load IOCs or correlations', err);
    } finally {
      setIocsLoading(false);
    }
  };

  const fetchGraph = async () => {
    if (!id) return;
    setGraphLoading(true);
    try {
      const res = await apiClient.get<CorrelationGraphData>(`/cases/${id}/correlation-graph`);
      setGraphData(res.data);
    } catch (err) {
      console.error('Failed to load correlation graph', err);
    } finally {
      setGraphLoading(false);
    }
  };

  const fetchSimilarities = async () => {
    if (!id) return;
    setSimilarityLoading(true);
    try {
      const res = await apiClient.get<EvidenceSimilarity[]>(`/cases/${id}/similar-evidence`);
      setSimilarities(res.data);
    } catch (err) {
      console.error('Failed to load evidence similarities', err);
    } finally {
      setSimilarityLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetail();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (activeTab === 'timeline') fetchTimeline();
    if (activeTab === 'iocs') fetchIOCsAndCorrelations();
    if (activeTab === 'graph') fetchGraph();
    if (activeTab === 'similarity') fetchSimilarities();
  }, [activeTab, id]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!caseData) return;
    setStatusUpdateLoading(true);
    try {
      await apiClient.patch(`/cases/${caseData.id}`, { status: newStatus });
      fetchCaseDetail();
      fetchTimeline();
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleAddNote = async (content: string) => {
    if (!caseData) return;
    await apiClient.post(`/cases/${caseData.id}/notes`, { note: content });
    fetchCaseDetail();
    fetchTimeline();
  };

  const handleDeleteNote = async (noteId: string) => {
    await apiClient.delete(`/notes/${noteId}`);
    fetchCaseDetail();
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData || !selectedFile) return;
    setUploadLoading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await apiClient.post(`/cases/${caseData.id}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowUploadModal(false);
      setSelectedFile(null);
      fetchCaseDetail();
      fetchTimeline();
      fetchIOCsAndCorrelations();
      fetchGraph();
      fetchSimilarities();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload evidence');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!caseData) return;
    setReportLoading(true);
    setReportSuccess(null);
    try {
      const res = await apiClient.post(`/reports/generate`, {
        case_id: caseData.id,
        classification: 'OFFICIAL USE ONLY / FOR JUDICIAL SUBMISSION',
      });
      setReportSuccess(`Report ${res.data.report_number} generated successfully!`);
      setTimeout(() => setReportSuccess(null), 6000);
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadEvidence = async (evidenceId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/evidence/${evidenceId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download evidence', err);
    }
  };

  const getEvidenceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'text':
        return <FileCode className="w-4 h-4 text-blue-600" />;
      case 'audio':
        return <FileAudio className="w-4 h-4 text-purple-600" />;
      case 'video':
        return <FileVideo className="w-4 h-4 text-sky-600" />;
      default:
        return <File className="w-4 h-4 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-slate-700">Accessing case file record...</p>
        <p className="text-xs text-slate-400 mt-1">Retrieving evidence digests and lifecycle audit trail</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <EmptyState
        title="Case Not Found"
        message="The requested investigation record does not exist or has been archived."
        actionLabel="Return to Cases"
        onAction={() => navigate('/cases')}
      />
    );
  }

  const tabs: Array<{ id: TabType; label: string; icon: any; count?: number }> = [
    { id: 'evidence', label: 'Evidence Vault', icon: FileCheck2, count: caseData.evidence_items.length },
    { id: 'timeline', label: 'Lifecycle Timeline', icon: Clock, count: timelineEvents.length },
    { id: 'iocs', label: 'IOCs & Infrastructure', icon: Network, count: caseIOCs.length },
    { id: 'graph', label: 'Topology Graph', icon: Sparkles },
    { id: 'similarity', label: 'Similarity & Duplicates', icon: Layers, count: similarities.length },
    { id: 'notes', label: 'Investigator Notes', icon: MessageSquare, count: caseData.notes.length },
    { id: 'copilot', label: 'Investigator Copilot', icon: Bot },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/cases')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Case Directory</span>
        </button>
      </div>

      {/* Case Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-blue-700 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
              {caseData.case_number}
            </span>
            <Badge variant="priority" value={caseData.priority} />
            <Badge variant="status" value={caseData.status} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            {caseData.title}
          </h1>
        </div>

        {/* Role-Aware Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowEvaluationModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Model Evaluation</span>
          </button>

          {(isAdmin || (isInvestigator && !isDemo)) && (
            <>
              <button
                onClick={() => setShowDemoModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Load Demo Sample</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Evidence</span>
              </button>

              <button
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
              >
                {reportLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>Generate Certified PDF</span>
              </button>
            </>
          )}

          {isReviewer && (
            <>
              <button
                onClick={() => setActiveTab('evidence')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Verify Evidence Integrity</span>
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>Review Case Reports</span>
              </button>
            </>
          )}

          {isDemo && (
            <button
              onClick={() => setShowDemoModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Load Synthetic Sample</span>
            </button>
          )}
        </div>
      </div>

      {/* Report Success Toast */}
      <AnimatePresence>
        {reportSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{reportSuccess}</span>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="font-bold text-emerald-700 hover:text-emerald-900 underline ml-4 cursor-pointer"
            >
              View in Reports &rarr;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Case Overview Metadata Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              Complaint Category
            </div>
            <div className="font-bold text-slate-900 text-sm mt-1">{caseData.complaint_category}</div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              Investigation Status
            </div>
            <select
              value={caseData.status}
              disabled={statusUpdateLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="mt-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl px-3 py-1.5 text-slate-800 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs transition"
            >
              <option value="under_investigation">Under Investigation</option>
              <option value="awaiting_review">Awaiting Review</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Lead Officer</div>
            <div className="font-semibold text-slate-900 text-sm mt-1">{caseData.assigned_investigator_name || 'Unassigned'}</div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Registration Date</div>
            <div className="font-semibold text-slate-900 text-sm mt-1">
              {new Date(caseData.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {caseData.description && (
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Initial Complaint Synopsis:
            </span>
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 font-mono leading-relaxed">
              {caseData.description}
            </div>
          </div>
        )}
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto shadow-2xs">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;

          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="pt-1">
        {/* TAB 1: EVIDENCE VAULT */}
        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <span>Forensic Evidence Vault &amp; SHA-256 Digest Registry</span>
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {caseData.evidence_items.length} file{caseData.evidence_items.length !== 1 ? 's' : ''} logged
              </span>
            </div>

            {caseData.evidence_items.length === 0 ? (
              <EmptyState
                icon={Upload}
                title="No digital evidence attached yet"
                message="Securely ingest forensic audio, video, messages, or files to compute SHA-256 hashes and run neural forensics."
                actionLabel="Upload First Evidence"
                onAction={() => setShowUploadModal(true)}
              />
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3 px-4">File / Artifact</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">SHA-256 Digest</th>
                        <th className="py-3 px-4">Processing Status</th>
                        <th className="py-3 px-4 text-right">Forensic Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {caseData.evidence_items.map((ev: EvidenceItem) => {
                        const isIntegrityOpen = expandedIntegrityId === ev.id;

                        return (
                          <React.Fragment key={ev.id}>
                            <tr className="hover:bg-slate-50/80 transition-colors group">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5 font-sans">
                                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 group-hover:border-blue-300 group-hover:text-blue-600 transition">
                                    {getEvidenceIcon(ev.evidence_type)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                      <span>{ev.original_filename}</span>
                                      {ev.original_filename.startsWith('[SYNTHETIC-DEMO]') && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                          SYNTHETIC DEMO
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 uppercase text-slate-600 font-semibold">{ev.evidence_type}</td>
                              <td className="py-3 px-4 text-slate-500">
                                {Math.round(ev.file_size / 1024)} KB
                              </td>
                              <td className="py-3 px-4 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="truncate max-w-[170px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-slate-700 font-mono"
                                    title={ev.sha256_hash}
                                  >
                                    {ev.sha256_hash.substring(0, 10)}...{ev.sha256_hash.substring(54)}
                                  </span>
                                  <button
                                    onClick={() => handleCopyHash(ev.sha256_hash)}
                                    title="Copy SHA-256 Digest"
                                    className="p-1 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                  >
                                    {copiedHash === ev.sha256_hash ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="status" value={ev.processing_status} />
                              </td>
                              <td className="py-3 px-4 text-right space-x-1.5 font-sans">
                                <button
                                  onClick={() =>
                                    setExpandedIntegrityId(isIntegrityOpen ? null : ev.id)
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 border transition cursor-pointer ${
                                    isIntegrityOpen
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{isIntegrityOpen ? 'Close Hash' : 'Verify Hash'}</span>
                                </button>

                                <button
                                  onClick={() => navigate(`/analysis?evidence_id=${ev.id}`)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Cpu className="w-3.5 h-3.5" />
                                  <span>Analyze</span>
                                </button>

                                <button
                                  onClick={() => handleDownloadEvidence(ev.id, ev.original_filename)}
                                  title="Download Original Evidence Artifact"
                                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>

                            {/* Expandable Evidence Integrity Row */}
                            {isIntegrityOpen && (
                              <tr>
                                <td colSpan={6} className="p-4 bg-slate-50/70 border-b border-slate-200">
                                  <EvidenceIntegrityComponent
                                    evidenceId={ev.id}
                                    filename={ev.original_filename}
                                    storedHash={ev.sha256_hash}
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIFECYCLE TIMELINE */}
        {activeTab === 'timeline' && (
          <EvidenceTimelineComponent events={timelineEvents} loading={timelineLoading} />
        )}

        {/* TAB 3: IOCS & INFRASTRUCTURE */}
        {activeTab === 'iocs' && (
          <IOCTableAndCorrelation
            iocs={caseIOCs}
            correlations={caseCorrelations}
            loading={iocsLoading}
            onSelectEvidence={(evId) => navigate(`/analysis?evidence_id=${evId}`)}
          />
        )}

        {/* TAB 4: TOPOLOGY GRAPH */}
        {activeTab === 'graph' && (
          <CorrelationGraphComponent graphData={graphData} loading={graphLoading} />
        )}

        {/* TAB 5: SIMILARITY & DUPLICATES */}
        {activeTab === 'similarity' && (
          <EvidenceSimilarityComponent similarities={similarities} loading={similarityLoading} />
        )}

        {/* TAB 6: INVESTIGATOR NOTES */}
        {activeTab === 'notes' && (
          <InvestigatorNotesComponent
            notes={caseData.notes}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        )}

        {/* TAB 7: INVESTIGATOR COPILOT */}
        {activeTab === 'copilot' && (
          <InvestigatorCopilotComponent caseId={caseData.id} />
        )}
      </div>

      {/* Upload Evidence Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span>Upload Digital Evidence to Case</span>
                </h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUploadEvidence} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-blue-50/20 transition">
                  <input
                    type="file"
                    id="evidence-file"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="evidence-file" className="cursor-pointer block">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    {selectedFile ? (
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 block truncate font-mono">
                          {selectedFile.name}
                        </span>
                        <span className="text-slate-500 font-mono mt-1 block">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600">
                        <span className="text-blue-600 font-bold underline">Select evidence file</span>{' '}
                        or drag &amp; drop
                        <p className="text-[11px] text-slate-400 mt-1">
                          Audio (WAV, MP3), Video (MP4), Image (PNG, JPG), Text (TXT)
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-600 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Cryptographic Hashing Guarantee
                    </span>
                    A SHA-256 digest is computed on ingest and logged to the immutable case chain of custody.
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadLoading || !selectedFile}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {uploadLoading ? 'Computing Hash & Ingesting...' : 'Ingest to Vault'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Synthetic Demonstration Assets Gallery Modal */}
      <SyntheticGalleryModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        caseId={caseData.id}
        onSampleAttached={() => {
          fetchCaseDetail();
          fetchTimeline();
          fetchIOCsAndCorrelations();
          fetchGraph();
          fetchSimilarities();
        }}
      />

      {/* Model Benchmark Evaluation Modal */}
      <ModelEvaluationModal
        isOpen={showEvaluationModal}
        onClose={() => setShowEvaluationModal(false)}
      />
    </div>
  );
};
