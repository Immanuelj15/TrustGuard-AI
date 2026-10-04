import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Case, GeneratedReport } from '../types';
import {
  FileText,
  Download,
  PlusCircle,
  FolderLock,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
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
    if (!selectedCaseId) return;
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
      <div className="pb-2 border-b border-[#17223b]">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <span>Investigation Reports Repository</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          DIGITALLY CERTIFIED INVESTIGATION ADVISORY REPORTS & FORENSIC EVIDENCE EXHIBITS
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Case Selector and Generator Banner */}
      <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <label className="block text-xs font-mono text-slate-400 mb-1">SELECT INVESTIGATION CASE</label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} — {c.title}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !selectedCaseId}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 disabled:opacity-50"
        >
          {generating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Compiling PDF Report...</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Generate New Investigation PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Reports Table */}
      <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl space-y-4">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Generated PDF Reports Archive</span>
        </h2>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No PDF reports generated for this case yet. Click above to compile an investigation report.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b14] text-slate-400 uppercase font-mono border-b border-[#17223b]">
                <tr>
                  <th className="py-2.5 px-3">Report Document</th>
                  <th className="py-2.5 px-3">Assessed Case Risk</th>
                  <th className="py-2.5 px-3">Evidence Count</th>
                  <th className="py-2.5 px-3">Generated Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17223b]/60">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#11192e]/60 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span className="font-medium text-slate-200">{r.file_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs text-amber-400">
                        {r.report_metadata_json?.risk_level || 'NEEDS_REVIEW'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {r.report_metadata_json?.evidence_count ?? 0} files
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDownload(r.id, r.file_name)}
                        className="px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 text-xs inline-flex items-center gap-1.5 font-medium"
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
