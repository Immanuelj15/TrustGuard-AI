import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { Case, EvidenceItem, AnalysisJob } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { SyntheticGalleryModal } from '../components/common/SyntheticGalleryModal';
import { SyntheticSample } from '../types';
import {
  Cpu,
  Play,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  FileAudio,
  FileVideo,
  Info,
  Clock,
  ShieldAlert,
  Sliders,
  Check,
  Activity,
  Layers,
  Sparkles,
  FlaskConical
} from 'lucide-react';

export const AnalysisWorkspacePage: React.FC = () => {
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

  // Synthetic Demo Asset State
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [selectedDemoSample, setSelectedDemoSample] = useState<SyntheticSample | null>(null);
  const [directDemoAnalyzing, setDirectDemoAnalyzing] = useState(false);

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

  // When selected case changes, load its evidence
  useEffect(() => {
    if (!selectedCaseId) return;
    const loadEvidence = async () => {
      try {
        const res = await apiClient.get<EvidenceItem[]>(`/cases/${selectedCaseId}/evidence`);
        setEvidenceList(res.data);
        if (res.data.length > 0 && !selectedEvidenceId) {
          setSelectedEvidenceId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load evidence', err);
      }
    };
    loadEvidence();
  }, [selectedCaseId]);

  // When selected evidence changes, load prior analysis jobs
  useEffect(() => {
    if (!selectedEvidenceId) return;
    const loadResults = async () => {
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
    };
    loadResults();
  }, [selectedEvidenceId]);

  const handleStartAnalysis = async () => {
    if (!selectedEvidenceId) return;
    setRunningAnalysis(true);
    try {
      const res = await apiClient.post<AnalysisJob>(`/evidence/${selectedEvidenceId}/analyze`, {
        analysis_type: analysisType,
      });
      setCurrentJob(res.data);
      // Refresh history
      const histRes = await apiClient.get<AnalysisJob[]>(`/evidence/${selectedEvidenceId}/results`);
      setJobHistory(histRes.data);
    } catch (err) {
      console.error('Analysis execution failed', err);
    } finally {
      setRunningAnalysis(false);
    }
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

  const selectedEvidence = evidenceList.find((e) => e.id === selectedEvidenceId);

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
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-blue-600" />
            <span>Multi-Modal AI Evidence Analysis Workspace</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Explainable social-engineering detection, acoustic voice cloning cues, and deepfake telemetry.
          </p>
        </div>

        <button
          onClick={() => setShowGalleryModal(true)}
          className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Synthetic Benchmark Assets (530)</span>
        </button>
      </div>

      {/* Target Selector & Config Bar */}
      <div className="surface-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Case Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
              Select Investigation Case
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

          {/* Pipeline Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
              Forensic Analysis Pipeline
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
        </div>

        {/* Selected Evidence Item Summary */}
        {selectedEvidence && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-slate-900">{selectedEvidence.original_filename}</span>
              <span className="text-slate-500 font-mono">({Math.round(selectedEvidence.file_size / 1024)} KB)</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[10px] font-semibold">
                {selectedEvidence.mime_type}
              </span>
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={runningAnalysis}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
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
          </div>
        )}
      </div>

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

      {/* Analysis Results Display */}
      {currentJob?.result ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Prominent Synthetic Warning Banner */}
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
                {selectedDemoSample && (
                  <div className="mt-2 pt-2 border-t border-amber-200 flex flex-wrap items-center gap-4 text-[11px] font-mono text-amber-900">
                    <span>Method: <strong>{selectedDemoSample.generation_method}</strong></span>
                    <span>Ground Truth Label: <strong>{selectedDemoSample.label}</strong></span>
                    <span>Synthetic Provenance: <strong>VERIFIED PROGRAMMATIC</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Score & Model Attribution Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Risk Gauge Card */}
            <div className="surface-card p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                Aggregated Risk Assessment
              </div>
              <div className="flex items-baseline gap-3 my-2">
                <span className={`text-3xl font-extrabold ${
                  currentJob.result.risk_level === 'CRITICAL' ? 'text-rose-600' :
                  currentJob.result.risk_level === 'HIGH' ? 'text-orange-600' :
                  currentJob.result.risk_level === 'MEDIUM' ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {currentJob.result.risk_level}
                </span>
                <span className="text-sm font-bold text-slate-500">
                  {currentJob.result.risk_score} / 100
                </span>
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
            </div>

            {/* Model Card */}
            <div className="surface-card p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px] flex items-center justify-between">
                <span>Inspection Engine Attribution</span>
                {hasHuggingFace ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-purple-100 text-purple-800 border border-purple-200">
                    LIVE HUGGING FACE
                  </span>
                ) : isSynthetic ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-100 text-amber-800 border border-amber-200">
                    SYNTHETIC DEMO
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-blue-100 text-blue-800 border border-blue-200">
                    RULE-BASED
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-900 text-sm mt-1">{currentJob.model_name}</div>
              <div className="text-xs font-mono text-blue-600 mt-0.5">Version: {currentJob.model_version}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-2">
                Execution Completed: {currentJob.completed_at ? new Date(currentJob.completed_at).toLocaleTimeString() : 'N/A'}
              </div>
            </div>

            {/* Confidence Calibration */}
            <div className="surface-card p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                Calibrated Confidence Level
              </div>
              <div className="text-3xl font-bold text-blue-600 my-2">
                {currentJob.result.model_confidence ? `${Math.round(currentJob.result.model_confidence * 100)}%` : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500">
                Calibrated across forensic test benchmarks & cue detectors
              </div>
            </div>
          </div>

          {/* Model Status Note (Transparent capability disclaimer) */}
          {currentJob.result.findings_json?.model_status_note && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
              <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <div className="font-bold uppercase tracking-wider text-[11px] text-amber-900">
                  Forensic Capability & Scientific Transparency Notice
                </div>
                <p className="mt-1 leading-relaxed text-slate-700 font-medium">
                  {currentJob.result.findings_json.model_status_note}
                </p>
              </div>
            </div>
          )}

          {/* Detailed Findings Breakdown */}
          <div className="surface-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span>Granular Explainable Findings & Cue Indicators</span>
            </h2>

            {/* If Text Scam Analysis */}
            {currentJob.result.findings_json?.hf_transformer_inference && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50/70 to-indigo-50/70 border border-purple-200 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-purple-950 text-xs uppercase tracking-wider">
                      Live Hugging Face Transformer Inference
                    </span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold border border-purple-200">
                    {currentJob.result.findings_json.hf_transformer_inference.model_name}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-purple-100">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Classification</span>
                    <span className={`font-bold uppercase text-sm ${
                      currentJob.result.findings_json.hf_transformer_inference.predicted_label === 'suspicious' ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {currentJob.result.findings_json.hf_transformer_inference.predicted_label}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-100">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Transformer Confidence</span>
                    <span className="font-bold text-purple-700 text-sm">
                      {Math.round(currentJob.result.findings_json.hf_transformer_inference.confidence * 100)}%
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-100">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Calibrated Risk</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {currentJob.result.findings_json.hf_transformer_inference.risk_score} / 100
                    </span>
                  </div>
                </div>
              </div>
            )}

            {currentJob.result.findings_json?.indicators && (
              <div className="space-y-3">
                {currentJob.result.findings_json.indicators.map((ind: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="risk" value={ind.severity} />
                        <span className="font-bold text-slate-900 text-xs">{ind.category}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">Weight Contribution: +{ind.weight_contribution}</span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">{ind.description}</p>

                    {ind.matches?.map((m: any, mIdx: number) => (
                      <div key={mIdx} className="p-3 rounded-lg bg-white border border-slate-200 text-xs font-mono">
                        <div className="text-slate-500 text-[10px] mb-1">
                          MATCHED PHRASE: <span className="text-rose-600 font-bold">"{m.matched_text}"</span>
                        </div>
                        <div className="text-slate-700 text-[11px] italic bg-slate-50 p-2 rounded">
                          "...{m.context_snippet}..."
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* If Audio Analysis */}
            {currentJob.result.findings_json?.acoustic_features && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider text-[11px]">
                  Acoustic Signal Telemetry
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Spectral Centroid</span>
                    <span className="text-slate-900 font-bold">{currentJob.result.findings_json.acoustic_features.spectral_centroid_hz} Hz</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Spectral Flatness</span>
                    <span className="text-slate-900 font-bold">{currentJob.result.findings_json.acoustic_features.spectral_flatness}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Zero Crossing Rate</span>
                    <span className="text-slate-900 font-bold">{currentJob.result.findings_json.acoustic_features.zero_crossing_rate}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Estimated SNR</span>
                    <span className="text-slate-900 font-bold">{currentJob.result.findings_json.acoustic_features.estimated_snr_db} dB</span>
                  </div>
                </div>

                {currentJob.result.findings_json.transcription && (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-600 text-[10px] uppercase block">
                        Speech-to-Text Forensic Transcription:
                      </span>
                      {currentJob.result.findings_json.hf_asr_inference ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-100 text-purple-800 border border-purple-200">
                          Hugging Face Whisper-tiny ASR
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700">
                          Baseline ASR
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 italic bg-slate-50 p-2.5 rounded-lg">
                      "{currentJob.result.findings_json.transcription}"
                    </p>

                    {/* Spoken Scam Indicators */}
                    {currentJob.result.findings_json.spoken_scam_indicators && currentJob.result.findings_json.spoken_scam_indicators.length > 0 && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-2 mt-2">
                        <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>Spoken Social-Engineering & Vishing Cues Detected</span>
                        </div>
                        <div className="space-y-1">
                          {currentJob.result.findings_json.spoken_scam_indicators.map((sInd: any, sIdx: number) => (
                            <div key={sIdx} className="text-[11px] text-rose-950 font-medium">
                              • <span className="font-bold">{sInd.category}:</span> {sInd.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* If Video Analysis */}
            {currentJob.result.findings_json?.technical_metadata && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider text-[11px]">
                  Video Forensic Stream Metadata
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Resolution</span>
                    <span className="text-slate-900 font-bold">{currentJob.result.findings_json.technical_metadata.resolution_estimate}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Container</span>
                    <span className="text-slate-900 font-bold">{currentJob.result.findings_json.technical_metadata.container_format}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Frame Rate</span>
                    <span className="text-slate-900 font-bold">{currentJob.result.findings_json.technical_metadata.estimated_fps} FPS</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Faces Tracked</span>
                    <span className="text-slate-900 font-bold">{currentJob.result.findings_json.face_detection?.faces_detected || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Limitations and Disclaimers */}
          <div className="surface-card p-5 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Forensic Methodological Limitations
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed font-normal">
              {currentJob.result.limitations_json.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      ) : (
        <div className="surface-card py-16">
          <EmptyState
            icon={Cpu}
            title="No analysis execution on record for this evidence"
            message="Select a digital evidence file above and click 'Execute AI Analysis' to initiate multi-modal explainable scoring."
            actionLabel={selectedEvidence ? "Run AI Analysis Now" : undefined}
            onAction={selectedEvidence ? handleStartAnalysis : undefined}
          />
        </div>
      )}

      {/* Synthetic Demonstration Asset Gallery Modal */}
      <SyntheticGalleryModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        caseId={selectedCaseId || undefined}
        onSelectForAnalysis={handleDirectAnalyzeDemo}
      />
    </div>
  );
};
