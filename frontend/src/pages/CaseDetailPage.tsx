import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { CaseDetail, EvidenceItem } from '../types';
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
  X
} from 'lucide-react';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Status update
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Note form
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

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

  useEffect(() => {
    fetchCaseDetail();
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
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData || !newNote.trim()) return;
    setNoteLoading(true);
    try {
      await apiClient.post(`/cases/${caseData.id}/notes`, { note: newNote.trim() });
      setNewNote('');
      fetchCaseDetail();
    } catch (err) {
      console.error('Failed to add note', err);
    } finally {
      setNoteLoading(false);
    }
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
      setReportSuccess(`Report generated successfully: ${res.data.file_name}`);
      setTimeout(() => setReportSuccess(null), 5000);
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
      console.error('Download failed', err);
    }
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'audio': return <FileAudio className="w-4 h-4 text-purple-400" />;
      case 'video': return <FileVideo className="w-4 h-4 text-cyan-400" />;
      case 'image': return <FileImage className="w-4 h-4 text-pink-400" />;
      case 'text': return <FileCode className="w-4 h-4 text-blue-400" />;
      default: return <FileCheck2 className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading || !caseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#17223b]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cases')}
            className="p-1.5 rounded-lg bg-[#0c1222] border border-[#17223b] hover:border-cyan-500/50 text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white font-mono">{caseData.case_number}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                caseData.priority === 'critical' ? 'bg-red-950 text-red-400 border border-red-800' :
                caseData.priority === 'high' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {caseData.priority}
              </span>
            </div>
            <h1 className="text-sm font-medium text-slate-300">{caseData.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-md shadow-cyan-950"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Evidence</span>
          </button>

          <button
            onClick={handleGenerateReport}
            disabled={reportLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#11192e] border border-[#1e2e4e] hover:border-cyan-500/50 text-slate-200 text-xs font-medium transition"
          >
            {reportLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Generate Investigation PDF</span>
          </button>
        </div>
      </div>

      {reportSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{reportSuccess}</span>
          </div>
          <button onClick={() => navigate('/reports')} className="underline font-mono text-cyan-300">
            View in Reports
          </button>
        </div>
      )}

      {/* Case Metadata Card */}
      <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-500 font-mono text-[10px]">COMPLAINT CATEGORY</div>
            <div className="font-semibold text-slate-200 mt-0.5">{caseData.complaint_category}</div>
          </div>
          <div>
            <div className="text-slate-500 font-mono text-[10px]">CASE STATUS</div>
            <select
              value={caseData.status}
              disabled={statusUpdateLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="mt-0.5 bg-[#070b14] border border-[#1e2e4e] text-cyan-300 px-2 py-1 rounded text-xs font-mono"
            >
              <option value="open">OPEN</option>
              <option value="under_investigation">UNDER INVESTIGATION</option>
              <option value="awaiting_review">AWAITING REVIEW</option>
              <option value="resolved">RESOLVED</option>
              <option value="closed">CLOSED</option>
            </select>
          </div>
          <div>
            <div className="text-slate-500 font-mono text-[10px]">ASSIGNED INVESTIGATOR</div>
            <div className="font-semibold text-slate-200 mt-0.5">{caseData.assigned_investigator_name || 'Unassigned'}</div>
          </div>
          <div>
            <div className="text-slate-500 font-mono text-[10px]">DATE REGISTERED</div>
            <div className="font-mono text-slate-300 mt-0.5">{new Date(caseData.created_at).toLocaleString()}</div>
          </div>
        </div>

        {caseData.description && (
          <div className="mt-4 pt-3 border-t border-[#17223b] text-xs text-slate-300 font-sans leading-relaxed">
            <span className="font-mono text-slate-500 text-[10px] block mb-1">INCIDENT STATEMENT:</span>
            {caseData.description}
          </div>
        )}
      </div>

      {/* Evidence Items Section */}
      <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
            <span>Digital Evidence Inventory & Cryptographic Chain of Custody</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">{caseData.evidence_items.length} files logged</span>
        </div>

        {caseData.evidence_items.length === 0 ? (
          <div className="p-8 rounded-lg bg-[#070b14] border border-[#17223b] text-center">
            <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No evidence items attached to this case yet.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-3 px-3 py-1.5 rounded bg-cyan-600 text-white text-xs hover:bg-cyan-500"
            >
              Upload Initial Evidence File
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b14] text-slate-400 uppercase font-mono border-b border-[#17223b]">
                <tr>
                  <th className="py-2.5 px-3">File / Item</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">SHA-256 Hash</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Forensic Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17223b]/60">
                {caseData.evidence_items.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#11192e]/60 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {getEvidenceIcon(ev.evidence_type)}
                        <span className="font-medium text-slate-100">{ev.original_filename}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono uppercase text-slate-400">{ev.evidence_type}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{Math.round(ev.file_size / 1024)} KB</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[200px]" title={ev.sha256_hash}>
                          {ev.sha256_hash.substring(0, 16)}...{ev.sha256_hash.substring(48)}
                        </span>
                        <button
                          onClick={() => handleCopyHash(ev.sha256_hash)}
                          title="Copy Full SHA-256 Digest"
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        ev.processing_status === 'analyzed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {ev.processing_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/analysis?evidence_id=${ev.id}`)}
                        className="px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 text-[11px] inline-flex items-center gap-1"
                      >
                        <Cpu className="w-3 h-3" />
                        <span>Analyze</span>
                      </button>
                      <button
                        onClick={() => handleDownloadEvidence(ev.id, ev.original_filename)}
                        className="px-2.5 py-1 rounded bg-[#17223b] hover:bg-slate-700 text-slate-300 text-[11px] inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Investigator Notes Section */}
      <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl space-y-4">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>Case Observations & Investigator Annotations</span>
        </h2>

        {/* Existing Notes Stream */}
        <div className="space-y-3">
          {caseData.notes.map((note) => (
            <div key={note.id} className="p-3.5 rounded-lg bg-[#070b14] border border-[#17223b] text-xs">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] mb-1.5">
                <span className="font-semibold text-cyan-300">{note.author_name}</span>
                <span>{new Date(note.created_at).toLocaleString()}</span>
              </div>
              <p className="text-slate-200 font-sans leading-relaxed">{note.note}</p>
            </div>
          ))}
          {caseData.notes.length === 0 && (
            <p className="text-xs text-slate-500 font-mono py-2">No notes added yet.</p>
          )}
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleAddNote} className="pt-2">
          <textarea
            rows={2}
            required
            placeholder="Add forensic observation, suspect lead, bank nodal response..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-sans"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={noteLoading || !newNote.trim()}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium disabled:opacity-50"
            >
              {noteLoading ? 'Saving...' : 'Add Case Annotation'}
            </button>
          </div>
        </form>
      </div>

      {/* Upload Evidence Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0c1222] border border-[#17223b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#17223b]">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <span>Upload Digital Evidence</span>
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadEvidence} className="space-y-4">
              <div className="border-2 border-dashed border-[#1e2e4e] hover:border-cyan-500/50 rounded-xl p-6 text-center bg-[#070b14]/50">
                <input
                  type="file"
                  id="evidence-file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="evidence-file" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  {selectedFile ? (
                    <div className="text-xs">
                      <span className="font-semibold text-slate-200 block truncate">{selectedFile.name}</span>
                      <span className="text-slate-500 font-mono mt-1 block">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">
                      <span className="text-cyan-400 font-semibold underline">Select evidence file</span> or drag & drop
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Audio (WAV, MP3), Video (MP4), Image (PNG, JPG), Text (TXT)
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-[#17223b] text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5 text-cyan-300 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>INTEGRITY SAFEGUARD</span>
                </div>
                SHA-256 cryptographic digest will be computed and permanently attached upon ingestion.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#17223b]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#11192e] text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || !selectedFile}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {uploadLoading ? 'Computing Hash & Ingesting...' : 'Ingest to Evidence Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
