import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Check className="w-3.5 h-3.5" />
            MATCH (VERIFIED)
          </span>
        );
      case 'HASH_MISMATCH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            HASH MISMATCH (INTEGRITY COMPROMISED)
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
            UNAVAILABLE (FILE NOT ON DISK)
          </span>
        );
    }
  };

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <FileLock className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Evidence Cryptographic Integrity
            </h4>
            <p className="text-[11px] text-slate-400">
              Deterministic verification against stored reference digest
            </p>
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Recomputing SHA-256...' : 'Verify Integrity'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* Algorithm & Stored Hash */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Algorithm: <strong className="text-slate-200">SHA-256</strong></span>
            <span className="text-[11px] text-slate-500 font-mono">Original Upload Record</span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded border border-slate-800/80">
            <span className="text-xs font-mono text-cyan-300 break-all select-all">
              {storedHash || 'No hash recorded'}
            </span>
            {storedHash && (
              <button
                onClick={() => handleCopyHash(storedHash)}
                title="Copy hash"
                className="text-slate-400 hover:text-slate-200 transition-colors shrink-0 p-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Verification Result */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Live Audit State:</span>
            {checkResult?.checked_at && (
              <span className="text-[11px] text-slate-500">
                {new Date(checkResult.checked_at).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="min-h-[38px] flex items-center">
            {checkResult ? (
              getStatusBadge(checkResult.status)
            ) : (
              <span className="text-xs text-slate-500 italic">
                Click &ldquo;Verify Integrity&rdquo; to re-hash stored file on disk and compare.
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Forensic Disclaimer */}
      <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-500">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>Forensic Notice:</strong> SHA-256 is used strictly to detect unauthorized changes or corruption to the stored evidence byte stream. Hashing alone does not establish legal authenticity or chain-of-custody without corroborating investigator oversight.
        </p>
      </div>
    </div>
  );
};
