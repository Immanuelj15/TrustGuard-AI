import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { 
  CaseDetail, 
  EvidenceItem, 
  TimelineEvent, 
  IOCItem, 
  IOCCorrelation, 
  CorrelationGraphData, 
  EvidenceSimilarity 
} from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { SyntheticGalleryModal } from '../components/common/SyntheticGalleryModal';
import { EvidenceTimelineComponent } from '../components/investigation/EvidenceTimelineComponent';
import { EvidenceIntegrityComponent } from '../components/investigation/EvidenceIntegrityComponent';
import { IOCTableAndCorrelation } from '../components/investigation/IOCTableAndCorrelation';
import { CorrelationGraphComponent } from '../components/investigation/CorrelationGraphComponent';
import { EvidenceSimilarityComponent } from '../components/investigation/EvidenceSimilarityComponent';
import { InvestigatorNotesComponent } from '../components/investigation/InvestigatorNotesComponent';
import { InvestigatorCopilotComponent } from '../components/investigation/InvestigatorCopilotComponent';
import { ModelEvaluationModal } from '../components/investigation/ModelEvaluationModal';
import {
  FolderLock,
  ArrowLeft,
  FileCheck2,
  Upload,
  FileText,
  Copy,
  Check,
  Download,
  Cpu,
  MessageSquare,
  AlertCircle,
  FileAudio,
  FileVideo,
  FileCode,
  FileImage,
  Clock,
  ShieldCheck,
  X,
  Sparkles,
  Network,
  Layers,
  Bot,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  // Tabs state
  type TabType = 'evidence' | 'timeline' | 'iocs' | 'graph' | 'similarity' | 'notes' | 'copilot';
  const [activeTab, setActiveTab] = useState<TabType>('evidence');

  // Investigation datasets
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [caseIOCs, setCaseIOCs] = useState<IOCItem[]>([]);
  const [caseCorrelations, setCaseCorrelations] = useState<IOCCorrelation[]>([]);
  const [iocsLoading, setIocsLoading] = useState(false);

  const [graphData, setGraphData] = useState<CorrelationGraphData>({ nodes: [], edges: [], total_nodes: 0, total_edges: 0 });
  const [graphLoading, setGraphLoading] = useState(false);

  const [similarities, setSimilarities] = useState<EvidenceSimilarity[]>([]);
  const [similarityLoading, setSimilarityLoading] = useState(false);

  // Inline integrity check drawer per evidence item
  const [expandedIntegrityId, setExpandedIntegrityId] = useState<string | null>(null);

  // Status update
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Report generation
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

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
        apiClient.get<IOCCorrelation[]>(`/cases/${id}/correlations`),
      ]);
      setCaseIOCs(iocsRes.data);
      setCaseCorrelations(corrRes.data);
    } catch (err) {
      console.error('Failed to load IOCs', err);
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
      console.error('Failed to load graph', err);
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
      console.error('Failed to load similarities', err);
    } finally {
      setSimilarityLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetail();
    fetchTimeline();
    fetchIOCsAndCorrelations();
    fetchGraph();
    fetchSimilarities();
  }, [id]);

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
      const res = await apiClient.post(`/cases/${caseData.id}/reports`);
      setReportSuccess(`Official investigation report generated: ${res.data.file_name}`);
      fetchTimeline();
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
    switch (type) {
      case 'audio':
        return <FileAudio className="w-4 h-4 text-cyan-400" />;
      case 'video':
        return <FileVideo className="w-4 h-4 text-purple-400" />;
      case 'text':
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'image':
        return <FileImage className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return <LoadingState message="Loading investigative case file &amp; custody vault..." />;
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
      {/* Back and Breadcrumb */}
      <div>
        <button
          onClick={() => navigate('/cases')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 font-semibold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Case Directory</span>
        </button>
      </div>

      {/* Case Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/80">
              {caseData.case_number}
            </span>
            <Badge variant="priority" value={caseData.priority} />
            <Badge variant="status" value={caseData.status} />
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-1">
            {caseData.title}
          </h1>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowEvaluationModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Model Evaluation</span>
          </button>

          <button
            onClick={() => setShowDemoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Demo Sample</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Evidence</span>
          </button>

          <button
            onClick={handleGenerateReport}
            disabled={reportLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 hover:bg-cyan-500/10 text-cyan-300 text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {reportLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Generate Certified PDF</span>
          </button>
        </div>
      </div>

      {/* Report Success Toast */}
      <AnimatePresence>
        {reportSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{reportSuccess}</span>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="font-semibold text-cyan-400 hover:underline ml-4 cursor-pointer"
            >
              View in Reports &rarr;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Case Overview Metadata Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              Complaint Category
            </div>
            <div className="font-semibold text-slate-200 mt-1">{caseData.complaint_category}</div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              Investigation Status
            </div>
            <select
              value={caseData.status}
              disabled={statusUpdateLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="mt-1 bg-slate-950 border border-slate-800 text-slate-200 px-2 py-1 rounded text-xs font-semibold focus:outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              <option value="open">Open</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="awaiting_review">Awaiting Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              Lead Officer
            </div>
            <div className="font-semibold text-slate-200 mt-1">
              {caseData.assigned_investigator_name || 'Insp. Rajesh Kumar'}
            </div>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              Registration Date
            </div>
            <div className="font-mono text-slate-400 mt-1">
              {new Date(caseData.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {caseData.description && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
              Initial Complaint Synopsis:
            </span>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-sans">
              {caseData.description}
            </div>
          </div>
        )}
      </div>

      {/* Investigation Feature Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-thin">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border-t-2 border-t-cyan-400 border-x border-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
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
      <div className="pt-2">
        {/* TAB 1: EVIDENCE VAULT */}
        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-cyan-400" />
                <span>Forensic Evidence Vault &amp; SHA-256 Digest Registry</span>
              </h2>
              <span className="text-xs text-slate-400">
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
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">File / Artifact</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">SHA-256 Digest</th>
                        <th className="py-2.5 px-3">Processing Status</th>
                        <th className="py-2.5 px-3 text-right">Forensic Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {caseData.evidence_items.map((ev) => {
                        const isIntegrityOpen = expandedIntegrityId === ev.id;

                        return (
                          <React.Fragment key={ev.id}>
                            <tr className="hover:bg-slate-900/40 transition group">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2 font-sans">
                                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 group-hover:border-cyan-500/40 group-hover:text-cyan-400 transition">
                                    {getEvidenceIcon(ev.evidence_type)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                      <span>{ev.original_filename}</span>
                                      {ev.original_filename.startsWith('[SYNTHETIC-DEMO]') && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                          SYNTHETIC DEMO
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 uppercase text-slate-400">{ev.evidence_type}</td>
                              <td className="py-3 px-3 text-slate-400">
                                {Math.round(ev.file_size / 1024)} KB
                              </td>
                              <td className="py-3 px-3 text-[11px] text-slate-300">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="truncate max-w-[170px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                                    title={ev.sha256_hash}
                                  >
                                    {ev.sha256_hash.substring(0, 10)}...{ev.sha256_hash.substring(54)}
                                  </span>
                                  <button
                                    onClick={() => handleCopyHash(ev.sha256_hash)}
                                    title="Copy SHA-256 Digest"
                                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                                  >
                                    {copiedHash === ev.sha256_hash ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <Badge variant="status" value={ev.processing_status} />
                              </td>
                              <td className="py-3 px-3 text-right space-x-1.5 font-sans">
                                <button
                                  onClick={() =>
                                    setExpandedIntegrityId(isIntegrityOpen ? null : ev.id)
                                  }
                                  className={`px-2 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 border transition cursor-pointer ${
                                    isIntegrityOpen
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                  <span>{isIntegrityOpen ? 'Close Hash' : 'Verify Hash'}</span>
                                </button>

                                <button
                                  onClick={() => navigate(`/analysis?evidence_id=${ev.id}`)}
                                  className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 font-semibold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Cpu className="w-3 h-3" />
                                  <span>Analyze</span>
                                </button>

                                <button
                                  onClick={() => handleDownloadEvidence(ev.id, ev.original_filename)}
                                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>

                            {/* Expandable Evidence Integrity Row */}
                            {isIntegrityOpen && (
                              <tr>
                                <td colSpan={6} className="p-3 bg-slate-900/80 border-b border-slate-800">
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Upload Digital Evidence to Case</span>
                </h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUploadEvidence} className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-6 text-center bg-slate-950/60 transition">
                  <input
                    type="file"
                    id="evidence-file"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="evidence-file" className="cursor-pointer block">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    {selectedFile ? (
                      <div className="text-xs">
                        <span className="font-bold text-slate-200 block truncate font-mono">
                          {selectedFile.name}
                        </span>
                        <span className="text-slate-400 font-mono mt-1 block">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        <span className="text-cyan-400 font-bold underline">Select evidence file</span>{' '}
                        or drag &amp; drop
                        <p className="text-[11px] text-slate-500 mt-1">
                          Audio (WAV, MP3), Video (MP4), Image (PNG, JPG), Text (TXT)
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-300 block">
                      Cryptographic Hashing Guarantee
                    </span>
                    A SHA-256 digest is immediately computed and logged to the immutable timeline.
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadLoading || !selectedFile}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
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
