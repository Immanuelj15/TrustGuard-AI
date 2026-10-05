import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { 
  Case, 
  EvidenceItem, 
  AnalysisJob, 
  SyntheticSample, 
  OpenRouterStatus, 
  EvidenceExplanation,
  IntegrityCheckResult,
  IOCItem,
  InvestigatorNote
} from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { SyntheticGalleryModal } from '../components/common/SyntheticGalleryModal';
import { PIIRedactionModal } from '../components/investigation/PIIRedactionModal';
import {
  Cpu,
  Play,
  AlertTriangle,
  FileCode,
  FileAudio,
  FileVideo,
  Info,
  Clock,
  ShieldAlert,
  Check,
  Activity,
  Layers,
  Sparkles,
  Bot,
  Lock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  EyeOff,
  X,
  Copy,
  FileText,
  FileLock,
  Tag,
  MessageSquare,
  Trash2,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export const AnalysisWorkspacePage: React.FC = () => {
  const { user, isAdmin, isInvestigator, isReviewer, isDemo } = useAuth();
  const canExecuteAnalysis = isAdmin || isInvestigator;

  const [searchParams] = useSearchParams();
  const initialEvidenceId = searchParams.get('evidence_id') || '';

  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(initialEvidenceId);
  const [analysisType, setAnalysisType] = useState<string>('auto');

  const [loadingCases, setLoadingCases] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
  const [jobHistory, setJobHistory] = useState<AnalysisJob[]>([]);

  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<'analysis' | 'iocs' | 'notes' | 'llm'>('analysis');

  // Evidence Integrity State
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // IOCs State
  const [evidenceIOCs, setEvidenceIOCs] = useState<IOCItem[]>([]);
  const [loadingIOCs, setLoadingIOCs] = useState(false);

  // Investigator Notes State
  const [evidenceNotes, setEvidenceNotes] = useState<InvestigatorNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // OpenRouter LLM State
  const [openRouterStatus, setOpenRouterStatus] = useState<OpenRouterStatus | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  const [explanationResult, setExplanationResult] = useState<EvidenceExplanation | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [showRedactionModal, setShowRedactionModal] = useState(false);

  // Synthetic Demo Asset State
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [selectedDemoSample, setSelectedDemoSample] = useState<SyntheticSample | null>(null);
  const [directDemoAnalyzing, setDirectDemoAnalyzing] = useState(false);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);
  const selectedEvidence = evidenceList.find((e) => e.id === selectedEvidenceId);

  // Load cases
  useEffect(() => {
    const loadCases = async () => {
      try {
        const res = await apiClient.get<Case[]>('/cases');
        setCases(res.data);
        if (res.data.length > 0 && !selectedCaseId) {
          setSelectedCaseId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load cases', err);
      } finally {
        setLoadingCases(false);
      }
    };
    loadCases();
  }, []);

  // Load OpenRouter status
  useEffect(() => {
    const fetchLlmStatus = async () => {
      try {
        const res = await apiClient.get<OpenRouterStatus>('/llm/status');
        setOpenRouterStatus(res.data);
      } catch (err) {
        console.warn('Could not load OpenRouter status', err);
      }
    };
    fetchLlmStatus();
  }, []);

  // When selected case changes, load its evidence
  useEffect(() => {
    if (!selectedCaseId) return;
    const loadEvidence = async () => {
      try {
        const res = await apiClient.get<EvidenceItem[]>(`/cases/${selectedCaseId}/evidence`);
        setEvidenceList(res.data);
        if (res.data.length > 0 && (!selectedEvidenceId || !res.data.some((e) => e.id === selectedEvidenceId))) {
          setSelectedEvidenceId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load evidence', err);
      }
    };
    loadEvidence();
  }, [selectedCaseId]);

  // When selected evidence changes, load prior analysis jobs, integrity check, IOCs, and notes
  useEffect(() => {
    setExplanationResult(null);
    setExplanationError(null);
    setConsentConfirmed(false);
    setIntegrityResult(null);
    setIntegrityError(null);
    setEvidenceIOCs([]);
    setEvidenceNotes([]);

    if (!selectedEvidenceId) return;

    const loadData = async () => {
      // 1. Prior analysis jobs
      try {
        const res = await apiClient.get<AnalysisJob[]>(`/evidence/${selectedEvidenceId}/results`);
        setJobHistory(res.data);
        if (res.data.length > 0) {
          setCurrentJob(res.data[0]);
        } else {
          setCurrentJob(null);
        }
      } catch (err) {
        console.error('Failed to load analysis history', err);
      }

      // 2. IOCs for this evidence
      try {
        setLoadingIOCs(true);
        const iocRes = await apiClient.get<IOCItem[]>(`/evidence/${selectedEvidenceId}/iocs`);
        setEvidenceIOCs(iocRes.data);
      } catch (err) {
        console.warn('Could not load evidence IOCs', err);
      } finally {
        setLoadingIOCs(false);
      }

      // 3. Notes for this evidence
      try {
        setLoadingNotes(true);
        const notesRes = await apiClient.get<InvestigatorNote[]>(`/evidence/${selectedEvidenceId}/notes`);
        setEvidenceNotes(notesRes.data);
      } catch (err) {
        console.warn('Could not load evidence notes', err);
      } finally {
        setLoadingNotes(false);
      }
    };

    loadData();
  }, [selectedEvidenceId]);

  const handleStartAnalysis = async () => {
    if (!selectedEvidenceId || !canExecuteAnalysis) return;
    setRunningAnalysis(true);
    try {
      const res = await apiClient.post<AnalysisJob>(`/evidence/${selectedEvidenceId}/analyze`, {
        analysis_type: analysisType,
      });
      setCurrentJob(res.data);
      // Refresh history & IOCs
      const [histRes, iocRes] = await Promise.all([
        apiClient.get<AnalysisJob[]>(`/evidence/${selectedEvidenceId}/results`),
        apiClient.get<IOCItem[]>(`/evidence/${selectedEvidenceId}/iocs`),
      ]);
      setJobHistory(histRes.data);
      setEvidenceIOCs(iocRes.data);
    } catch (err) {
      console.error('Analysis execution failed', err);
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!selectedEvidenceId) return;
    setIntegrityLoading(true);
    setIntegrityError(null);
    try {
      const res = await apiClient.post<IntegrityCheckResult>(`/evidence/${selectedEvidenceId}/verify-integrity`);
      setIntegrityResult(res.data);
    } catch (err: any) {
      console.error('Integrity check failed', err);
      setIntegrityError(err?.response?.data?.detail || 'Failed to verify evidence file hash.');
    } finally {
      setIntegrityLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvidenceId || !newNoteText.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await apiClient.post<InvestigatorNote>(`/evidence/${selectedEvidenceId}/notes`, {
        note: newNoteText.trim(),
      });
      setEvidenceNotes([res.data, ...evidenceNotes]);
      setNewNoteText('');
    } catch (err) {
      console.error('Failed to add note', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await apiClient.delete(`/notes/${noteId}`);
      setEvidenceNotes(evidenceNotes.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDirectAnalyzeDemo = async (sample: SyntheticSample) => {
    setDirectDemoAnalyzing(true);
    setSelectedDemoSample(sample);
    setShowGalleryModal(false);
    try {
      const res = await apiClient.post<any>(`/demo/direct-analyze/${sample.sample_id}`);
      if (res.data && res.data.analysis_job) {
        setCurrentJob(res.data.analysis_job);
      }
    } catch (err) {
      console.error('Failed to run direct demo analysis', err);
    } finally {
      setDirectDemoAnalyzing(false);
    }
  };

  const handleGenerateExplanation = async () => {
    if (!selectedEvidenceId) return;
    setGeneratingExplanation(true);
    setExplanationError(null);
    setShowConsentModal(false);
    try {
      const res = await apiClient.post<EvidenceExplanation>(`/evidence/${selectedEvidenceId}/explain`, {
        user_consent: true,
      });
      setExplanationResult(res.data);
    } catch (err: any) {
      console.error('Failed to generate LLM explanation', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to generate explanation';
      setExplanationError(msg);
    } finally {
      setGeneratingExplanation(false);
    }
  };

  const getEvidenceTextForRedaction = () => {
    if (currentJob?.result?.findings_json?.transcription) {
      return currentJob.result.findings_json.transcription;
    }
    if (currentJob?.result?.findings_json?.extracted_text) {
      return currentJob.result.findings_json.extracted_text;
    }
    if (selectedDemoSample?.summary) {
      return selectedDemoSample.summary;
    }
    return selectedEvidence?.original_filename || 'No evidence text available.';
  };

  const isSynthetic = Boolean(
    selectedDemoSample !== null ||
    selectedEvidence?.original_filename.startsWith('[SYNTHETIC-DEMO]') ||
    currentJob?.result?.findings_json?.is_synthetic_demo === true ||
    currentJob?.model_name?.includes('Synthetic') ||
    currentJob?.result?.findings_json?.banner?.includes('SYNTHETIC')
  );

  const hasHuggingFace = Boolean(
    currentJob?.result?.findings_json?.hf_transformer_inference ||
    currentJob?.result?.findings_json?.hf_asr_inference ||
    currentJob?.model_name?.includes('HuggingFace') ||
    currentJob?.model_name?.includes('Whisper')
  );

  return (
    <div className="space-y-6">
      {/* Top Banner: Case TG-XXX Header with Live Risk & Integrity (Section 11) */}
      <div className="surface-card p-5 border-l-4 border-l-blue-600 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono font-extrabold text-sm px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                {selectedCase ? selectedCase.case_number : 'CASE TG-000'}
              </span>
              <h1 className="text-lg font-bold text-slate-900">
                {selectedCase ? selectedCase.title : 'Digital Evidence Investigation Workspace'}
              </h1>
              {isDemo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  DEMO MODE
                </span>
              )}
              {isReviewer && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                  REVIEWER AUDIT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {selectedEvidence 
                ? `Active Target: ${selectedEvidence.original_filename} (${Math.round(selectedEvidence.file_size / 1024)} KB, ${selectedEvidence.mime_type})`
                : 'Select digital evidence item below to inspect telemetry and AI outputs.'}
            </p>
          </div>

          {/* Quick Metrics Bar: Risk Level & Evidence Integrity */}
          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            {/* Risk Gauge Header Tag */}
            {currentJob?.result ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500">Risk Assessment</span>
                <span className={`text-xs font-extrabold ${
                  currentJob.result.risk_level === 'CRITICAL' ? 'text-rose-600' :
                  currentJob.result.risk_level === 'HIGH' ? 'text-orange-600' :
                  currentJob.result.risk_level === 'MEDIUM' ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {currentJob.result.risk_level} {currentJob.result.risk_score}/100
                </span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs font-medium">
                UNSCORED EVIDENCE
              </div>
            )}

            {/* Cryptographic Integrity Header Tag */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              integrityResult?.status === 'VERIFIED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : integrityResult?.status === 'HASH_MISMATCH'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              <ShieldCheck className={`w-3.5 h-3.5 ${
                integrityResult?.status === 'VERIFIED' ? 'text-emerald-600' :
                integrityResult?.status === 'HASH_MISMATCH' ? 'text-rose-600' : 'text-blue-600'
              }`} />
              <span>
                {integrityResult?.status === 'VERIFIED' ? 'INTEGRITY VERIFIED' :
                 integrityResult?.status === 'HASH_MISMATCH' ? 'HASH MISMATCH' :
                 'SHA-256 ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Target Evidence, Integrity Card & Execution Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Target Selector Card */}
          <div className="surface-card p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Target Investigation Case & Media</span>
            </h2>

            {/* Case Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                Investigation Case
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => {
                  setSelectedCaseId(e.target.value);
                  setSelectedEvidenceId('');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Evidence Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                Target Digital Evidence
              </label>
              <select
                value={selectedEvidenceId}
                onChange={(e) => setSelectedEvidenceId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              >
                {evidenceList.map((e) => (
                  <option key={e.id} value={e.id}>
                    [{e.evidence_type.toUpperCase()}] {e.original_filename}
                  </option>
                ))}
                {evidenceList.length === 0 && (
                  <option value="">No evidence items found for case</option>
                )}
              </select>
            </div>
          </div>

          {/* Section 14: Evidence Cryptographic Integrity UI Card */}
          {selectedEvidence && (
            <div className="surface-card p-5 space-y-3.5 border-t-2 border-t-emerald-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileLock className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Evidence Integrity
                  </span>
                </div>
                {integrityResult?.status === 'VERIFIED' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>VERIFIED</span>
                  </span>
                ) : integrityResult?.status === 'HASH_MISMATCH' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>HASH MISMATCH</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-slate-100 text-slate-600 border border-slate-200">
                    SHA-256 RECORDED
                  </span>
                )}
              </div>

              {/* Mismatch Alert Notice (Section 14) */}
              {integrityResult?.status === 'HASH_MISMATCH' && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">⚠ HASH MISMATCH DETECTED</span>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      The current file digest differs from the recorded SHA-256 reference digest. Evidence integrity may be compromised.
                    </p>
                  </div>
                </div>
              )}

              {/* Integrity Parameters */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Algorithm</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">SHA-256</span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                    <span>Digest Reference</span>
                    <button
                      onClick={() => handleCopyHash(selectedEvidence.sha256_hash)}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 normal-case font-medium cursor-pointer"
                    >
                      {copiedHash ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 break-all select-all mt-0.5">
                    {selectedEvidence.sha256_hash}
                  </div>
                </div>

                {integrityResult?.checked_at && (
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Last Verified:</span>
                    <span className="font-mono font-medium">
                      {new Date(integrityResult.checked_at).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Verify Action Button */}
              <button
                onClick={handleVerifyIntegrity}
                disabled={integrityLoading}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${integrityLoading ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
                <span>{integrityLoading ? 'Recomputing Digest...' : 'Verify Again'}</span>
              </button>
            </div>
          )}

          {/* Pipeline Execution / Role Guard Card */}
          <div className="surface-card p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Forensic Analysis Execution</span>
            </h2>

            {/* Role Guidance Notification */}
            {isReviewer ? (
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-purple-950">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Reviewer Mode — Read-Only Forensic Audit</span>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed font-normal">
                  You can inspect all acoustic telemetry, BERT model classifications, and cryptographic digests. Direct pipeline re-execution is restricted to Investigators and Admins.
                </p>
              </div>
            ) : isDemo ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Demo Mode — Synthetic Telemetry</span>
                </span>
                <p className="text-[11px] text-amber-800">
                  Execution on demo assets runs safely against synthetic benchmarks without accessing real case databases.
                </p>
              </div>
            ) : null}

            {/* Pipeline Configuration Selector */}
            {canExecuteAnalysis && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                  Pipeline Architecture
                </label>
                <select
                  value={analysisType}
                  onChange={(e) => setAnalysisType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                >
                  <option value="auto">Auto-Detect by Media Type</option>
                  <option value="text">Scam Text & Social Engineering Engine</option>
                  <option value="audio">Voice Clone Acoustic Telemetry</option>
                  <option value="video">Deepfake Visual & Facial Cues</option>
                </select>
              </div>
            )}

            {/* Execution Buttons */}
            {canExecuteAnalysis ? (
              <button
                onClick={handleStartAnalysis}
                disabled={runningAnalysis || !selectedEvidenceId}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {runningAnalysis ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Execute AI Analysis</span>
                  </>
                )}
              </button>
            ) : (
              <div className="text-center py-2 text-xs text-slate-400 font-medium">
                Analysis execution disabled in current role
              </div>
            )}

            {/* Synthetic Benchmark Assets Quick Action */}
            <button
              onClick={() => setShowGalleryModal(true)}
              className="w-full py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-blue-200 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Synthetic Benchmark Assets (530)</span>
            </button>
          </div>
        </div>

        {/* Right Column: Multi-Modal Analysis Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Navigation Tabs (Overview / Analysis, IOCs, Notes, AI Explanation) */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'analysis'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Forensic Analysis</span>
            </button>

            <button
              onClick={() => setActiveTab('iocs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'iocs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>IOC Indicators ({evidenceIOCs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Investigator Notes ({evidenceNotes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('llm')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'llm'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Explanation (OpenRouter)</span>
            </button>
          </div>

          {/* TAB 1: FORENSIC ANALYSIS (Separated 5 Output Types & Explainable Risk) */}
          {activeTab === 'analysis' && (
            <div className="space-y-5">
              {/* Synthetic Notice Banner if applicable */}
              {isSynthetic && (
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 shadow-sm flex items-start gap-3.5">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm tracking-wide text-amber-900 uppercase">
                          DEMO RESULT — GENERATED SYNTHETIC DATA
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                          ACADEMIC BENCHMARK ONLY
                        </span>
                      </div>
                      {selectedDemoSample && (
                        <span className="text-[11px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          Sample: {selectedDemoSample.sample_id} ({selectedDemoSample.modality.toUpperCase()})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      This analysis was executed on a safe synthetic demonstration asset generated programmatically for TrustGuard AI testing.
                      <strong> It does not contain genuine victim evidence or real human facial/vocal biometric data</strong>, and must not be used to claim real-world operational accuracy or legal findings.
                    </p>
                  </div>
                </div>
              )}

              {/* Direct Demo Analyzing Spinner */}
              {directDemoAnalyzing && (
                <div className="surface-card p-8 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-slate-800">
                    Running Forensic Telemetry Pipeline on Synthetic Demo Sample...
                  </p>
                  <span className="text-xs font-mono text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    DEMO EXECUTION — SAFE SYNTHETIC PIPELINE
                  </span>
                </div>
              )}

              {currentJob?.result ? (
                <div className="space-y-5">
                  {/* Section 13: Professional Explainable Risk Card */}
                  <div className="surface-card p-5 border-l-4 border-l-blue-600 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Risk Assessment
                        </div>
                        <div className="flex items-baseline gap-3 my-1">
                          <span className={`text-3xl font-black ${
                            currentJob.result.risk_level === 'CRITICAL' ? 'text-rose-600' :
                            currentJob.result.risk_level === 'HIGH' ? 'text-orange-600' :
                            currentJob.result.risk_level === 'MEDIUM' ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>
                            {currentJob.result.risk_level}
                          </span>
                          <span className="text-lg font-bold text-slate-600 font-mono">
                            {currentJob.result.risk_score} / 100
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Inference Engine</span>
                        <span className="font-bold text-xs text-slate-800">{currentJob.model_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          v{currentJob.model_version}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          currentJob.result.risk_score > 70 ? 'bg-rose-500' :
                          currentJob.result.risk_score > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${currentJob.result.risk_score}%` }}
                      />
                    </div>

                    {/* Contributing Indicators Breakdown (Section 13) */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Contributing Indicators</span>
                        <span className="font-mono text-blue-600">Points Added</span>
                      </div>

                      <div className="space-y-1.5">
                        {currentJob.result.findings_json?.granular_breakdown ? (
                          currentJob.result.findings_json.granular_breakdown.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-slate-800 font-medium">{item.category}</span>
                              <span className="font-mono font-bold text-rose-600">+{item.points}</span>
                            </div>
                          ))
                        ) : currentJob.result.findings_json?.indicators ? (
                          currentJob.result.findings_json.indicators.map((ind: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-slate-800 font-medium">{ind.category}</span>
                              <span className="font-mono font-bold text-rose-600">+{ind.weight_contribution || 15}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-400 italic">No specific weighted indicators recorded.</div>
                        )}
                      </div>

                      {/* Required Scientific Disclaimer (Section 13) */}
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        AI-assisted / heuristic assessment — Do not treat as definitive probability of crime or legal guilt.
                      </p>
                    </div>
                  </div>

                  {/* Section 12: FIVE SEPARATE AI OUTPUT TYPES */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span>Multi-Modal Telemetry & Output Types</span>
                    </h3>

                    {/* 1. MODEL RESULT (BERT / Machine Learning Classifier) */}
                    <div className="surface-card p-4 space-y-3 border-l-4 border-l-purple-600">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                            [MODEL RESULT]
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            BERT Social-Engineering & Scam Classification
                          </span>
                        </div>
                        {hasHuggingFace && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            HUGGING FACE LIVE INFERENCE
                          </span>
                        )}
                      </div>

                      {currentJob.result.findings_json?.hf_transformer_inference ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Model Verdict</span>
                            <span className={`font-extrabold uppercase text-sm ${
                              currentJob.result.findings_json.hf_transformer_inference.predicted_label === 'suspicious'
                                ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              {currentJob.result.findings_json.hf_transformer_inference.predicted_label}
                            </span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Transformer Confidence</span>
                            <span className="font-extrabold text-purple-700 text-sm font-mono">
                              {Math.round(currentJob.result.findings_json.hf_transformer_inference.confidence * 100)}%
                            </span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Classifier Risk</span>
                            <span className="font-extrabold text-slate-800 text-sm font-mono">
                              {currentJob.result.findings_json.hf_transformer_inference.risk_score} / 100
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                          <span>Classification: <strong>{currentJob.result.risk_level}</strong></span>
                          <span>Confidence: <strong>{currentJob.result.model_confidence ? `${Math.round(currentJob.result.model_confidence * 100)}%` : 'Baseline'}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* 2. RULE-BASED INDICATORS (Heuristic Matchers) */}
                    <div className="surface-card p-4 space-y-3 border-l-4 border-l-amber-500">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                            [RULE-BASED INDICATORS]
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            Deterministic Pattern & Threat Matching Cues
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 font-mono">
                          {currentJob.result.findings_json?.indicators?.length || 0} Matched Cues
                        </span>
                      </div>

                      {currentJob.result.findings_json?.indicators && currentJob.result.findings_json.indicators.length > 0 ? (
                        <div className="space-y-2.5">
                          {currentJob.result.findings_json.indicators.map((ind: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="risk" value={ind.severity} />
                                  <span className="font-bold text-slate-900">{ind.category}</span>
                                </div>
                                <span className="font-mono text-[11px] font-bold text-rose-600">
                                  +{ind.weight_contribution || 15} pts
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px]">{ind.description}</p>
                              {ind.matches?.map((m: any, mIdx: number) => (
                                <div key={mIdx} className="p-2 rounded bg-white border border-slate-200 text-[11px] font-mono">
                                  <span className="text-slate-400 font-semibold uppercase text-[9px] block">Matched Phrase:</span>
                                  <span className="text-rose-600 font-bold">"{m.matched_text}"</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                          No heuristic regex or pattern violations matched in this file.
                        </div>
                      )}
                    </div>

                    {/* 3. TRANSCRIPTION & ACOUSTIC TELEMETRY (Speech-to-Text) */}
                    <div className="surface-card p-4 space-y-3 border-l-4 border-l-blue-500">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                            [TRANSCRIPTION & ACOUSTICS]
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            Whisper ASR Speech-to-Text & Signal Telemetry
                          </span>
                        </div>
                        {currentJob.result.findings_json?.hf_asr_inference && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            WHISPER-TINY ASR
                          </span>
                        )}
                      </div>

                      {currentJob.result.findings_json?.transcription ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs italic text-slate-800 leading-relaxed font-serif">
                            "{currentJob.result.findings_json.transcription}"
                          </div>
                          {currentJob.result.findings_json?.acoustic_features && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Centroid</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {currentJob.result.findings_json.acoustic_features.spectral_centroid_hz} Hz
                                </span>
                              </div>
                              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Flatness</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {currentJob.result.findings_json.acoustic_features.spectral_flatness}
                                </span>
                              </div>
                              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Zero Crossing</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {currentJob.result.findings_json.acoustic_features.zero_crossing_rate}
                                </span>
                              </div>
                              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Estimated SNR</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {currentJob.result.findings_json.acoustic_features.estimated_snr_db} dB
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                          {selectedEvidence?.evidence_type === 'audio'
                            ? 'No speech detected or audio transcription could not be completed for this audio stream.'
                            : selectedEvidence?.evidence_type === 'video'
                            ? 'Video container telemetry recorded. For speech transcription & voice clone forensic biometrics, ingest audio track (.wav, .mp3, .m4a, .ogg).'
                            : 'Audio transcription not applicable to this text/document media item.'}
                        </div>
                      )}
                    </div>

                    {/* 4. AI EXPLANATION (OpenRouter LLM Layer) */}
                    <div className="surface-card p-4 space-y-3 border-l-4 border-l-teal-600">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-teal-100 text-teal-800 border border-teal-200 uppercase">
                            [AI EXPLANATION]
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            LLM Deep Contextual Reasoning & Deception Analysis
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveTab('llm')}
                          className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>Open Full Reasoning Layer</span>
                          <Bot className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {explanationResult ? (
                        <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-xs text-slate-800 space-y-1.5">
                          <div className="font-bold text-teal-950 flex items-center justify-between">
                            <span>Summary by {explanationResult.model_id}</span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                              {explanationResult.overall_assessment} RISK
                            </span>
                          </div>
                          <p className="leading-relaxed font-normal">{explanationResult.summary}</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                          <span>OpenRouter AI explanation ready to generate with investigator consent.</span>
                          <button
                            onClick={() => setActiveTab('llm')}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Explore AI Reasoning
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 5. INVESTIGATOR CONCLUSION (Human Review & Notes) */}
                    <div className="surface-card p-4 space-y-3 border-l-4 border-l-slate-700">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-slate-200 text-slate-800 border border-slate-300 uppercase">
                            [INVESTIGATOR CONCLUSION]
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            Human Verification & Investigative Notes
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveTab('notes')}
                          className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>Manage Notes ({evidenceNotes.length})</span>
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {evidenceNotes.length > 0 ? (
                        <div className="space-y-2">
                          {evidenceNotes.slice(0, 2).map((note) => (
                            <div key={note.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="font-bold text-slate-800">{note.author_name || 'Investigator'}</span>
                                <span className="font-mono">{new Date(note.created_at).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-slate-800 font-medium">{note.note}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                          <span>No human notes attached to this evidence yet.</span>
                          <button
                            onClick={() => setActiveTab('notes')}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                          >
                            + Add Note
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="surface-card py-16">
                  <EmptyState
                    icon={Cpu}
                    title="No analysis execution on record for this evidence"
                    message="Select a digital evidence file and execute multi-modal scoring to view machine learning telemetry and explainable indicators."
                    actionLabel={canExecuteAnalysis && selectedEvidence ? "Execute AI Analysis Now" : undefined}
                    onAction={canExecuteAnalysis && selectedEvidence ? handleStartAnalysis : undefined}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INDICATORS OF COMPROMISE (IOCs) */}
          {activeTab === 'iocs' && (
            <div className="surface-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span>Indicators of Compromise (IOCs) Extracted</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Extracted communication artifacts, telecom addresses, and external network links.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {evidenceIOCs.length} Identified
                </span>
              </div>

              {loadingIOCs ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading extracted indicators...</div>
              ) : evidenceIOCs.length === 0 ? (
                <EmptyState
                  icon={Tag}
                  title="No IOCs extracted for this evidence"
                  message="Run analysis or choose an evidence item containing contact info, phone numbers, or URLs."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {evidenceIOCs.map((ioc) => (
                    <div key={ioc.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-800 border border-blue-200">
                          {ioc.ioc_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(ioc.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-xs break-all">
                        {ioc.normalized_value || ioc.value}
                      </div>
                      {ioc.context_snippet && (
                        <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-200">
                          "...{ioc.context_snippet}..."
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVESTIGATOR NOTES & CONCLUSION */}
          {activeTab === 'notes' && (
            <div className="surface-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>Investigator Findings & Human Conclusion</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Maintain tamper-evident contemporaneous notes attached to this evidence artifact.
                  </p>
                </div>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  rows={3}
                  required
                  placeholder="Record your investigative observation, verification findings, or legal recommendation..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingNote || !newNoteText.trim() || !selectedEvidenceId}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <span>Attach Note to Evidence</span>
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                {loadingNotes ? (
                  <div className="py-8 text-center text-xs text-slate-500">Loading notes...</div>
                ) : evidenceNotes.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No notes recorded yet. Add your first note above.
                  </div>
                ) : (
                  evidenceNotes.map((note) => (
                    <div key={note.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span className="font-bold text-slate-800">{note.author_name || 'Investigator'}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{new Date(note.created_at).toLocaleString()}</span>
                          {(isAdmin || (user && user.id === note.user_id)) && (
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-800 font-medium leading-relaxed">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: OPENROUTER AI REASONING */}
          {activeTab === 'llm' && (
            <div className="surface-card p-5 space-y-4 border-l-4 border-l-teal-600">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Investigator AI Reasoning & Evidence Explanation</span>
                      {explanationResult ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-teal-100 text-teal-900 border border-teal-300">
                          LIVE OPENROUTER
                        </span>
                      ) : openRouterStatus?.enabled && openRouterStatus?.configured ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700">
                          READY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-500">
                          MODEL UNAVAILABLE
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Contextual breakdown of psychological coercion, deceptive patterns, and investigative steps.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowRedactionModal(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                    <span>Preview Redaction</span>
                  </button>

                  {!explanationResult && !generatingExplanation && (
                    <button
                      onClick={() => {
                        setConsentConfirmed(false);
                        setShowConsentModal(true);
                      }}
                      disabled={!openRouterStatus?.enabled || !openRouterStatus?.configured}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Generate AI Explanation</span>
                    </button>
                  )}

                  {explanationResult && !generatingExplanation && (
                    <button
                      onClick={() => {
                        setConsentConfirmed(false);
                        setShowConsentModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Generating Animation */}
              {generatingExplanation && (
                <div className="p-6 rounded-xl bg-teal-50/50 border border-teal-200/70 flex flex-col items-center justify-center gap-3 text-center animate-pulse">
                  <div className="w-7 h-7 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
                  <div className="text-xs font-semibold text-teal-900">
                    Transmitting redacted excerpt to OpenRouter ({openRouterStatus?.model || 'LLM'})...
                  </div>
                  <p className="text-[11px] text-teal-700 max-w-md">
                    Analyzing psychological coercion, authority impersonation tactics, and drafting investigator recommendations.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {explanationError && !generatingExplanation && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-rose-900">
                      Explanation Request Failed
                    </div>
                    <p>{explanationError}</p>
                  </div>
                </div>
              )}

              {/* Explanation Output */}
              {explanationResult && !generatingExplanation && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Model:</span>
                      <span className="font-mono font-bold text-teal-800">{explanationResult.model_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Assessment:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        explanationResult.overall_assessment === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                        explanationResult.overall_assessment === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {explanationResult.overall_assessment} RISK
                      </span>
                    </div>
                    {explanationResult.was_redacted && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>{explanationResult.redaction_notice}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Executive Explanation Summary
                    </h4>
                    <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 text-slate-800 text-xs font-medium leading-relaxed">
                      {explanationResult.summary}
                    </div>
                  </div>

                  {explanationResult.suspicious_indicators.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Identified Deceptive & Suspicious Indicators
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {explanationResult.suspicious_indicators.map((ind, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                            <div className="font-bold text-slate-900 text-xs text-blue-900">
                              {ind.indicator}
                            </div>
                            <p className="text-xs text-slate-600 leading-normal">{ind.reason}</p>
                            {ind.supporting_text && (
                              <div className="text-[11px] font-mono text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                                "{ind.supporting_text}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Possible Social-Engineering Tactics
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {explanationResult.possible_social_engineering_tactics.map((tactic, tIdx) => (
                          <span key={tIdx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-medium shadow-2xs">
                            {tactic}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Recommended Investigation Follow-ups
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                        {explanationResult.recommended_investigation_steps.map((step, sIdx) => (
                          <li key={sIdx} className="leading-snug">{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-100 text-slate-600 text-[11px] flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>
                      <strong>Investigative Aid Notice:</strong> AI-generated explanation is an analytical assistant, not legal proof or a definitive finding of guilt.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* External AI Processing & Privacy Confirmation Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5 text-teal-800">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  External AI Processing & Privacy Confirmation
                </h3>
              </div>
              <button
                onClick={() => setShowConsentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700 leading-relaxed">
              <p>
                You are requesting an AI-assisted explanation for:
                <br />
                <span className="font-bold text-slate-900 font-mono">{selectedEvidence?.original_filename}</span>
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">External Provider:</span>
                  <span className="font-bold text-slate-800">OpenRouter API</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Configured Model:</span>
                  <span className="font-mono font-bold text-teal-700">{openRouterStatus?.model || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Transmission Format:</span>
                  <span className="font-bold text-slate-800">Redacted text excerpt only</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1.5">
                <div className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-amber-950">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Privacy & Redaction Safeguards</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                  <li>Phone numbers, email addresses, credentials, and accounts are masked before transmission.</li>
                  <li>Original audio recordings and video media files are <strong>NEVER</strong> uploaded to external APIs.</li>
                  <li>Only the derived text transcript or communication excerpt is analyzed.</li>
                  <li>AI explanations are investigative aids and do not constitute legal proof.</li>
                </ul>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50/60 border border-teal-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(e) => setConsentConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="text-[11px] font-semibold text-teal-950">
                  I understand and explicitly approve transmitting this redacted excerpt to OpenRouter for forensic explanation.
                </span>
              </label>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowConsentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateExplanation}
                disabled={!consentConfirmed}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Confirm & Generate Explanation</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Synthetic Demonstration Asset Gallery Modal */}
      <SyntheticGalleryModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        caseId={selectedCaseId || undefined}
        onSelectForAnalysis={handleDirectAnalyzeDemo}
      />

      {/* PII Redaction Preview Modal */}
      <PIIRedactionModal
        isOpen={showRedactionModal}
        onClose={() => setShowRedactionModal(false)}
        originalText={getEvidenceTextForRedaction()}
      />
    </div>
  );
};
