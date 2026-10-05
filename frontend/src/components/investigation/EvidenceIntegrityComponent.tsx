import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { IntegrityCheckResult } from '../../types';
import { ShieldCheck, AlertTriangle, HelpCircle, Check, Copy, RefreshCw, FileLock } from 'lucide-react';

interface EvidenceIntegrityProps {
  evidenceId: string;
  filename: string;
  storedHash: string;
  onVerified?: (result: IntegrityCheckResult) => void;
}

export const EvidenceIntegrityComponent: React.FC<EvidenceIntegrityProps> = ({
  evidenceId,
  filename,
  storedHash,
  onVerified,
}) => {
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<IntegrityCheckResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<IntegrityCheckResult>(`/evidence/${evidenceId}/verify-integrity`);
      setCheckResult(res.data);
      if (onVerified) {
        onVerified(res.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to verify evidence file integrity.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3.5 h-3.5" />
            MATCH (VERIFIED INTACT)
          </span>
        );
      case 'HASH_MISMATCH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            HASH MISMATCH (INTEGRITY COMPROMISED)
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <HelpCircle className="w-3.5 h-3.5" />
            UNAVAILABLE (FILE NOT FOUND ON DISK)
          </span>
        );
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <FileLock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Evidence Cryptographic Integrity
            </h4>
            <p className="text-xs text-slate-500">
              Deterministic verification against stored reference digest ({filename})
            </p>
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Recomputing SHA-256...' : 'Verify Integrity'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Algorithm & Stored Hash */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Algorithm: <strong className="text-slate-900">SHA-256</strong></span>
            <span className="text-[11px] text-slate-500 font-mono font-medium">Original Ingestion Digest</span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-xs font-mono text-slate-800 break-all select-all font-medium">
              {storedHash || 'No hash recorded'}
            </span>
            {storedHash && (
              <button
                onClick={() => handleCopyHash(storedHash)}
                title="Copy hash"
                className="text-slate-400 hover:text-blue-600 transition-colors shrink-0 p-1 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Verification Result */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Live Audit State:</span>
            {checkResult?.checked_at && (
              <span className="text-[11px] text-slate-500 font-mono">
                {new Date(checkResult.checked_at).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="min-h-[42px] flex items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            {checkResult ? (
              getStatusBadge(checkResult.status)
            ) : (
              <span className="text-xs text-slate-400 italic">
                Click &ldquo;Verify Integrity&rdquo; to re-hash the file bytes and compare with the stored digest.
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Forensic Disclaimer */}
      <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-700">Forensic Notice:</strong> SHA-256 is used strictly to detect unauthorized changes or corruption to the stored evidence byte stream. Hashing alone does not establish legal authenticity or chain-of-custody without corroborating investigator oversight.
        </p>
      </div>
    </div>
  );
};
