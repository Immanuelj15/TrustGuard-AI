import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { ShieldCheck, Eye, EyeOff, AlertCircle, Copy, Check, X, Lock } from 'lucide-react';

interface PIIRedactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
}

export const PIIRedactionModal: React.FC<PIIRedactionModalProps> = ({
  isOpen,
  onClose,
  originalText,
}) => {
  const [redactedText, setRedactedText] = useState<string>('');
  const [redactedCount, setRedactedCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && originalText) {
      setLoading(true);
      apiClient
        .post('/tools/redact-preview', { text: originalText })
        .then((res) => {
          setRedactedText(res.data.redacted_text);
          setRedactedCount(res.data.redacted_count);
        })
        .catch((err) => {
          console.error('Failed to preview redaction', err);
          setRedactedText(originalText);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, originalText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(redactedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                PII Detection &amp; Sanitization Preview
              </h3>
              <p className="text-[11px] text-slate-400">
                Local regex masking of sensitive personal identifiers before external transmission
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-semibold">
                {redactedCount} Sensitive Identifier{redactedCount !== 1 ? 's' : ''} Masked
              </span>
              <span className="text-[11px] text-slate-400">
                (Phone numbers, Email IDs, IPv4, Credentials/OTPs, Account numbers)
              </span>
            </div>

            <button
              onClick={handleCopy}
              disabled={loading || !redactedText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Sanitized Text'}
            </button>
          </div>

          {/* Side by side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Original Evidence Vault Text
                </span>
                <span className="text-[10px] text-slate-500">Unmodified Source</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {originalText || 'No text content provided.'}
              </div>
            </div>

            {/* Redacted */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5" />
                  Sanitized AI Transmission Excerpt
                </span>
                <span className="text-[10px] text-slate-500">Sanitized Copy</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs font-mono text-emerald-200/90 h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    Applying deterministic PII filters...
                  </div>
                ) : (
                  redactedText || 'No redacted output available.'
                )}
              </div>
            </div>
          </div>

          {/* Integrity Guarantee Alert */}
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-2.5 text-xs text-slate-300">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-cyan-300 block">
                Evidence Preservation Guarantee:
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The original evidence file in the digital evidence vault is NEVER modified or overwritten. Sanitization is strictly performed on an in-memory copy before dispatching payloads to external AI or public report views.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </motion.div>
    </div>
  );
};
