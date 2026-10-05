import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { CopilotResponse } from '../../types';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  Cpu, 
  Lock, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface InvestigatorCopilotProps {
  caseId: string;
}

export const InvestigatorCopilotComponent: React.FC<InvestigatorCopilotProps> = ({ caseId }) => {
  const [question, setQuestion] = useState('');
  const [userConsent, setUserConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ q: string; a: CopilotResponse }>>([]);
  const [error, setError] = useState<string | null>(null);

  const samplePrompts = [
    'What are the strongest suspicious indicators?',
    'Which evidence contains the same domain?',
    'Summarize the investigation so far.',
    'What should I manually verify next?',
  ];

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<CopilotResponse>(`/cases/${caseId}/copilot`, {
        question: q,
        investigator_consent: userConsent,
      });

      setHistory((prev) => [...prev, { q, a: res.data }]);
      setQuestion('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to query investigator copilot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Investigator Copilot &bull; Ask This Case
            </h4>
            <p className="text-[11px] text-slate-400">
              Grounded forensic case reasoning with local-first deterministic fallback
            </p>
          </div>
        </div>

        {/* Consent Toggle */}
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700">
          <input
            type="checkbox"
            checked={userConsent}
            onChange={(e) => setUserConsent(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
          />
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Enable OpenRouter LLM (Redacted)
          </span>
        </label>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-500 font-mono">Suggested:</span>
        {samplePrompts.map((p) => (
          <button
            key={p}
            onClick={() => handleAsk(p)}
            disabled={loading}
            className="px-2.5 py-1 rounded-md text-[11px] bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Q&A Stream */}
      <div className="space-y-3 min-h-[160px] max-h-[460px] overflow-y-auto p-1">
        {history.length === 0 ? (
          <div className="py-10 text-center border border-slate-800/80 rounded-xl bg-slate-950/40">
            <Bot className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-300 font-medium">Ask questions grounded in this case file</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Copilot indexes evidence filenames, extracted IOCs, transcripts, and investigator notes. Works 100% locally with zero paid API requirement.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 p-3.5 rounded-xl border border-slate-800 bg-slate-900/60"
            >
              {/* Question */}
              <div className="flex items-start gap-2 text-xs">
                <span className="font-semibold text-cyan-400 font-mono shrink-0">Q:</span>
                <span className="text-slate-100 font-medium">{item.q}</span>
              </div>

              {/* Answer */}
              <div className="pl-4 border-l-2 border-cyan-500/40 text-xs text-slate-300 space-y-2">
                <p className="whitespace-pre-wrap leading-relaxed">{item.a.answer}</p>

                {/* References & Metadata */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="font-mono text-slate-500">Provider:</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-cyan-300">
                      {item.a.provider}
                    </span>
                    {item.a.pii_redacted && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        PII Sanitized
                      </span>
                    )}
                  </div>

                  {item.a.references && item.a.references.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-slate-500">References:</span>
                      <span className="font-mono text-slate-300">
                        {item.a.references.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Copilot a question about this case..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          {loading ? 'Analyzing...' : 'Ask'}
        </button>
      </form>

      {/* Forensic Disclaimer */}
      <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-500">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>Forensic Guardrails:</strong> Copilot responses are investigative decision aids strictly grounded in the case evidence files. Copilot cannot alter evidence, delete audit logs, execute shell/SQL commands, or produce definitive legal conclusions.
        </p>
      </div>
    </div>
  );
};
