import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Case, EvidenceItem, AnalysisJob } from '../types';
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
  Check
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

  const selectedEvidence = evidenceList.find((e) => e.id === selectedEvidenceId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#17223b]">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span>Multi-Modal AI Digital Evidence Analysis Workspace</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          EXPLAINABLE SOCIAL-ENGINEERING DETECTION, ACOUSTIC TELEMETRY & DEEPFAKE CUES
        </p>
      </div>

      {/* Target Selector & Config Bar */}
      <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Case Selector */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">SELECT INVESTIGATION CASE</label>
            <select
              value={selectedCaseId}
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                setSelectedEvidenceId('');
              }}
              className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
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
            <label className="block text-xs font-mono text-slate-400 mb-1">TARGET DIGITAL EVIDENCE</label>
            <select
              value={selectedEvidenceId}
              onChange={(e) => setSelectedEvidenceId(e.target.value)}
              className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
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
            <label className="block text-xs font-mono text-slate-400 mb-1">FORENSIC PIPELINE</label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
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
          <div className="p-3 rounded-lg bg-[#070b14] border border-[#17223b] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-200">{selectedEvidence.original_filename}</span>
              <span className="text-slate-500 font-mono">({Math.round(selectedEvidence.file_size / 1024)} KB)</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                {selectedEvidence.mime_type}
              </span>
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={runningAnalysis}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 shadow-lg shadow-cyan-950 disabled:opacity-50"
            >
              {runningAnalysis ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute AI Analysis</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Analysis Results Display */}
      {currentJob?.result ? (
        <div className="space-y-6">
          {/* Score & Model Attribution Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Risk Gauge Card */}
            <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl">
              <div className="text-xs font-mono text-slate-400 mb-1">AGGREGATED RISK ASSESSMENT</div>
              <div className="flex items-baseline gap-3 my-2">
                <span className={`text-3xl font-extrabold font-mono ${
                  currentJob.result.risk_level === 'CRITICAL' ? 'text-red-400' :
                  currentJob.result.risk_level === 'HIGH' ? 'text-orange-400' :
                  currentJob.result.risk_level === 'MEDIUM' ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {currentJob.result.risk_level}
                </span>
                <span className="text-sm font-mono text-slate-400">
                  {currentJob.result.risk_score} / 100
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    currentJob.result.risk_score > 70 ? 'bg-red-500' :
                    currentJob.result.risk_score > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${currentJob.result.risk_score}%` }}
                ></div>
              </div>
            </div>

            {/* Model Card */}
            <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl">
              <div className="text-xs font-mono text-slate-400 mb-1">INSPECTION ENGINE ATTRIBUTION</div>
              <div className="font-semibold text-slate-100 text-sm mt-1">{currentJob.model_name}</div>
              <div className="text-xs font-mono text-cyan-400 mt-0.5">Version: {currentJob.model_version}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-2">
                Completed: {currentJob.completed_at ? new Date(currentJob.completed_at).toLocaleTimeString() : 'N/A'}
              </div>
            </div>

            {/* Confidence Calibration */}
            <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl">
              <div className="text-xs font-mono text-slate-400 mb-1">MODEL CALIBRATED CONFIDENCE</div>
              <div className="text-3xl font-bold font-mono text-cyan-300 my-2">
                {currentJob.result.model_confidence ? `${Math.round(currentJob.result.model_confidence * 100)}%` : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Evaluated against forensic test benchmarks
              </div>
            </div>
          </div>

          {/* Model Status Note (Transparent capability disclaimer) */}
          {currentJob.result.findings_json?.model_status_note && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs flex items-start gap-3">
              <Info className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <div className="font-semibold uppercase tracking-wider font-mono text-[11px]">
                  CAPABILITY & MODEL INTEGRATION NOTICE
                </div>
                <p className="mt-1 leading-relaxed text-slate-200">
                  {currentJob.result.findings_json.model_status_note}
                </p>
              </div>
            </div>
          )}

          {/* Detailed Findings Breakdown */}
          <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl space-y-4">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Granular Explainable Findings</span>
            </h2>

            {/* If Text Scam Analysis */}
            {currentJob.result.findings_json?.indicators && (
              <div className="space-y-3">
                {currentJob.result.findings_json.indicators.map((ind: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-lg bg-[#070b14] border border-[#17223b] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          ind.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                          ind.severity === 'HIGH' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                          'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {ind.severity}
                        </span>
                        <span className="font-semibold text-slate-200 text-xs">{ind.category}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Score Weight: +{ind.weight_contribution}</span>
                    </div>

                    <p className="text-xs text-slate-300">{ind.description}</p>

                    {ind.matches?.map((m: any, mIdx: number) => (
                      <div key={mIdx} className="p-2.5 rounded bg-[#0c1222] border border-[#1e2e4e] text-xs font-mono">
                        <div className="text-slate-400 text-[10px] mb-0.5">MATCHED PATTERN: <span className="text-red-400 font-bold">"{m.matched_text}"</span></div>
                        <div className="text-slate-300 text-[11px] italic">"...{m.context_snippet}..."</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* If Audio Analysis */}
            {currentJob.result.findings_json?.acoustic_features && (
              <div className="p-4 rounded-lg bg-[#070b14] border border-[#17223b] space-y-3">
                <h3 className="text-xs font-mono text-cyan-400 uppercase">Acoustic Signal Telemetry</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2 rounded bg-[#0c1222]">
                    <span className="text-slate-500 block text-[10px]">SPECTRAL CENTROID</span>
                    <span className="text-slate-200">{currentJob.result.findings_json.acoustic_features.spectral_centroid_hz} Hz</span>
                  </div>
                  <div className="p-2 rounded bg-[#0c1222]">
                    <span className="text-slate-500 block text-[10px]">SPECTRAL FLATNESS</span>
                    <span className="text-slate-200">{currentJob.result.findings_json.acoustic_features.spectral_flatness}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0c1222]">
                    <span className="text-slate-500 block text-[10px]">ZERO CROSSING RATE</span>
                    <span className="text-slate-200">{currentJob.result.findings_json.acoustic_features.zero_crossing_rate}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0c1222]">
                    <span className="text-slate-500 block text-[10px]">ESTIMATED SNR</span>
                    <span className="text-slate-200">{currentJob.result.findings_json.acoustic_features.estimated_snr_db} dB</span>
                  </div>
                </div>

                {currentJob.result.findings_json.transcription && (
                  <div className="p-3 rounded bg-[#0c1222] border border-[#1e2e4e] text-xs">
                    <span className="font-mono text-cyan-400 text-[10px] block mb-1">SPEECH-TO-TEXT TRANSCRIPT:</span>
                    <p className="text-slate-200 italic">"{currentJob.result.findings_json.transcription}"</p>
                  </div>
                )}
              </div>
            )}

            {/* If Video Analysis */}
            {currentJob.result.findings_json?.technical_metadata && (
              <div className="p-4 rounded-lg bg-[#070b14] border border-[#17223b] space-y-3">
                <h3 className="text-xs font-mono text-cyan-400 uppercase">Video Forensic Stream Metadata</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2 rounded bg-[#0c1222]">
                    <span className="text-slate-500 block text-[10px]">RESOLUTION</span>
                    <span className="text-slate-200">{currentJob.result.findings_json.technical_metadata.resolution_estimate}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0c1222]">
                    <span className="text-slate-500 block text-[10px]">CONTAINER</span>
                    <span className="text-slate-200">{currentJob.result.findings_json.technical_metadata.container_format}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0c1222]">
                    <span className="text-slate-500 block text-[10px]">FPS</span>
                    <span className="text-slate-200">{currentJob.result.findings_json.technical_metadata.estimated_fps}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0c1222]">
                    <span className="text-slate-500 block text-[10px]">FACES OBSERVED</span>
                    <span className="text-slate-200">{currentJob.result.findings_json.face_detection?.faces_detected || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Limitations and Disclaimers */}
          <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl space-y-2">
            <h3 className="text-xs font-mono text-slate-400 uppercase">Methodological Limitations</h3>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 leading-relaxed font-sans">
              {currentJob.result.limitations_json.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-xl bg-[#0c1222] border border-[#17223b] text-center">
          <Cpu className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-slate-200">No analysis has been run for this evidence item</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Select a digital evidence file above and click "Execute AI Analysis" to trigger explainable forensic scoring.
          </p>
        </div>
      )}
    </div>
  );
};
