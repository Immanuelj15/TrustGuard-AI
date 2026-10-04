import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { CaseDetail, EvidenceItem } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { SyntheticGalleryModal } from '../components/common/SyntheticGalleryModal';
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
  Send,
  Sparkles
} from 'lucide-react';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

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
      setReportSuccess(`Official investigation report generated: ${res.data.file_name}`);
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
      console.error('Download failed', err);
    }
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'audio': return <FileAudio className="w-4 h-4 text-purple-600" />;
      case 'video': return <FileVideo className="w-4 h-4 text-blue-600" />;
      case 'image': return <FileImage className="w-4 h-4 text-sky-600" />;
      case 'text': return <FileCode className="w-4 h-4 text-indigo-600" />;
      default: return <FileCheck2 className="w-4 h-4 text-slate-500" />;
    }
  };

  if (loading || !caseData) {
    return (
      <div className="py-24">
        <LoadingState message="Decentralizing case records & evidence hashes..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cases')}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900 font-mono">{caseData.case_number}</span>
              <Badge variant="priority" value={caseData.priority} />
              <Badge variant="status" value={caseData.status} />
            </div>
            <h1 className="text-sm font-semibold text-slate-600 mt-0.5">{caseData.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowDemoModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold shadow-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Load Demo Sample</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Evidence</span>
          </button>

          <button
            onClick={handleGenerateReport}
            disabled={reportLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {reportLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>Generate PDF Report</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {reportSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{reportSuccess}</span>
            </div>
            <button 
              onClick={() => navigate('/reports')} 
              className="font-semibold text-blue-600 hover:underline ml-4"
            >
              View in Reports &rarr;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Case Metadata Card */}
      <div className="surface-card p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-xs">
          <div>
            <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Complaint Category</div>
            <div className="font-bold text-slate-900 mt-1">{caseData.complaint_category}</div>
          </div>
          <div>
            <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Case Status Control</div>
            <select
              value={caseData.status}
              disabled={statusUpdateLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="mt-1 bg-slate-50 border border-slate-200 text-slate-900 px-2.5 py-1 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            >
              <option value="open">Open</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="awaiting_review">Awaiting Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Assigned Officer</div>
            <div className="font-bold text-slate-900 mt-1">{caseData.assigned_investigator_name || 'Unassigned'}</div>
          </div>
          <div>
            <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Registered Date</div>
            <div className="font-mono text-slate-700 mt-1 font-medium">{new Date(caseData.created_at).toLocaleString()}</div>
          </div>
        </div>

        {caseData.description && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
              Incident Statement & Details:
            </span>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
              {caseData.description}
            </div>
          </div>
        )}
      </div>

      {/* Evidence Items Section */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <span>Digital Evidence Inventory & Cryptographic Chain of Custody</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">{caseData.evidence_items.length} files logged</span>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">File / Item</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">SHA-256 Digest</th>
                  <th className="py-2.5 px-3">Processing Status</th>
                  <th className="py-2.5 px-3 text-right">Forensic Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {caseData.evidence_items.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                          {getEvidenceIcon(ev.evidence_type)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{ev.original_filename}</span>
                            {ev.original_filename.startsWith('[SYNTHETIC-DEMO]') && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                SYNTHETIC DEMO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono uppercase text-slate-600">{ev.evidence_type}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{Math.round(ev.file_size / 1024)} KB</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[180px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200" title={ev.sha256_hash}>
                          {ev.sha256_hash.substring(0, 12)}...{ev.sha256_hash.substring(52)}
                        </span>
                        <button
                          onClick={() => handleCopyHash(ev.sha256_hash)}
                          title="Copy Full SHA-256 Digest"
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition"
                        >
                          {copiedHash === ev.sha256_hash ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="status" value={ev.processing_status} />
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/analysis?evidence_id=${ev.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] inline-flex items-center gap-1 transition"
                      >
                        <Cpu className="w-3 h-3" />
                        <span>Analyze</span>
                      </button>
                      <button
                        onClick={() => handleDownloadEvidence(ev.id, ev.original_filename)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition"
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
      <div className="surface-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>Case Observations & Forensic Annotations</span>
        </h2>

        {/* Existing Notes Stream */}
        <div className="space-y-2.5">
          {caseData.notes.map((note) => (
            <div key={note.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1 font-mono">
                <span className="font-semibold text-blue-700">{note.author_name}</span>
                <span>{new Date(note.created_at).toLocaleString()}</span>
              </div>
              <p className="text-slate-800 font-medium leading-relaxed">{note.note}</p>
            </div>
          ))}
          {caseData.notes.length === 0 && (
            <p className="text-xs text-slate-500 py-1">No notes or observations registered yet.</p>
          )}
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleAddNote} className="pt-2">
          <textarea
            rows={2}
            required
            placeholder="Add investigative lead, suspect trace, court deposition notes..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={noteLoading || !newNote.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{noteLoading ? 'Saving...' : 'Add Case Annotation'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Upload Evidence Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Upload Digital Evidence</span>
                </h2>
                <button 
                  onClick={() => setShowUploadModal(false)} 
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUploadEvidence} className="space-y-4">
                <div className="border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-2xl p-6 text-center bg-blue-50/30 transition">
                  <input
                    type="file"
                    id="evidence-file"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="evidence-file" className="cursor-pointer block">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2.5">
                      <Upload className="w-6 h-6" />
                    </div>
                    {selectedFile ? (
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 block truncate">{selectedFile.name}</span>
                        <span className="text-slate-500 font-mono mt-1 block">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        <span className="text-blue-600 font-bold underline">Select evidence file</span> or drag & drop
                        <p className="text-[11px] text-slate-400 mt-1">
                          Audio (WAV, MP3), Video (MP4), Image (PNG, JPG), Text (TXT)
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 block">Cryptographic Chain of Custody</span>
                    A SHA-256 hash is computed in real-time to preserve immutable evidence integrity.
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadLoading || !selectedFile}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
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
        onSampleAttached={() => fetchCaseDetail()}
      />
    </div>
  );
};
