import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { Case, GeneratedReport } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import {
  FileText,
  Download,
  PlusCircle,
  FolderLock,
  Clock,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { isAdmin, isInvestigator, isReviewer, isDemo } = useAuth();
  const canGenerateReport = isAdmin || isInvestigator;

  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load cases
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await apiClient.get<Case[]>('/cases');
        setCases(res.data);
        if (res.data.length > 0 && !selectedCaseId) {
          setSelectedCaseId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load cases', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  // Fetch reports when selected case changes
  const fetchReports = async () => {
    if (!selectedCaseId) return;
    try {
      const res = await apiClient.get<GeneratedReport[]>(`/cases/${selectedCaseId}/reports`);
      setReports(res.data);
    } catch (err) {
      console.error('Failed to load reports', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedCaseId]);

  const handleGenerate = async () => {
    if (!selectedCaseId || !canGenerateReport) return;
    setGenerating(true);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post<GeneratedReport>(`/cases/${selectedCaseId}/reports`);
      setSuccessMsg(`PDF Generated: ${res.data.file_name}`);
      fetchReports();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId: string, filename: string) => {
    try {
      const res = await apiClient.get(`/reports/${reportId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Investigation Reports Repository</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Digitally certified investigation advisory reports, evidence exhibits, and court-ready documentation.
          </p>
        </div>

        {isReviewer && (
          <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Reviewer Mode — PDF Audit & Inspection</span>
          </span>
        )}
        {isDemo && (
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Demo Mode — Synthetic Advisory Reports</span>
          </span>
        )}
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-sm font-semibold"
          >
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Case Selector and Generator Banner */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
            Select Investigation Case
          </label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} — {c.title}
              </option>
            ))}
          </select>
        </div>

        {canGenerateReport ? (
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedCaseId}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Compiling PDF Report...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Generate New Investigation PDF</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-right">
            <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl inline-block font-medium">
              Report compilation restricted to Investigators and Admins
            </span>
          </div>
        )}
      </div>

      {/* Reports Table */}
      <div className="surface-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Generated PDF Reports Archive</span>
        </h2>

        {reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No PDF reports generated for this case yet"
            message="Compile a verified investigation report containing chain of custody, evidence hashes, and AI cues."
            actionLabel={canGenerateReport ? "Generate Report Now" : undefined}
            onAction={canGenerateReport ? handleGenerate : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Report Document</th>
                  <th className="py-2.5 px-3">Assessed Case Risk</th>
                  <th className="py-2.5 px-3">Evidence Count</th>
                  <th className="py-2.5 px-3">Generated Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-900">{r.file_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge 
                        variant="risk" 
                        value={r.report_metadata_json?.risk_level || 'NEEDS_REVIEW'} 
                      />
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600">
                      {r.report_metadata_json?.evidence_count ?? 0} files
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDownload(r.id, r.file_name)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs inline-flex items-center gap-1.5 font-semibold transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
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
  );
};
