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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Investigator Copilot &bull; Case Intelligence Assistant
            </h4>
            <p className="text-xs text-slate-500">
              Grounded forensic case reasoning with deterministic local fallback
            </p>
          </div>
        </div>

        {/* Consent Toggle */}
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300">
          <input
            type="checkbox"
            checked={userConsent}
            onChange={(e) => setUserConsent(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <span className="flex items-center gap-1.5 text-[11px] font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Enable OpenRouter LLM (Sanitized)
          </span>
        </label>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Suggested:</span>
        {samplePrompts.map((p) => (
          <button
            key={p}
            onClick={() => handleAsk(p)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Q&A Stream */}
      <div className="space-y-3 min-h-[160px] max-h-[460px] overflow-y-auto p-1">
        {history.length === 0 ? (
          <div className="py-12 px-6 text-center border border-slate-200 rounded-2xl bg-white shadow-xs">
            <Bot className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-800 font-bold">Ask questions grounded in this case file</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Copilot indexes evidence filenames, extracted IOCs, transcripts, and investigator notes. Works 100% locally with zero paid API requirement.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2.5 p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs"
            >
              {/* Question */}
              <div className="flex items-start gap-2.5 text-xs">
                <span className="font-bold text-blue-600 font-mono shrink-0">Q:</span>
                <span className="text-slate-900 font-semibold">{item.q}</span>
              </div>

              {/* Answer */}
              <div className="pl-4 border-l-2 border-blue-500 text-xs text-slate-700 space-y-2">
                <p className="whitespace-pre-wrap leading-relaxed">{item.a.answer}</p>

                {/* References & Metadata */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="font-medium text-slate-400">Provider:</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-mono text-slate-700 font-semibold">
                      {item.a.provider}
                    </span>
                    {item.a.pii_redacted && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        PII Sanitized
                      </span>
                    )}
                  </div>

                  {item.a.references && item.a.references.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="text-slate-400 font-medium">References:</span>
                      <span className="font-mono text-slate-800 font-semibold">
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
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Copilot a question about this case..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          {loading ? 'Analyzing...' : 'Ask'}
        </button>
      </form>

      {/* Forensic Disclaimer */}
      <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-700">Forensic Guardrails:</strong> Copilot responses are investigative decision aids strictly grounded in the case evidence files. Copilot cannot alter evidence, delete audit logs, execute shell/SQL commands, or produce definitive legal conclusions.
        </p>
      </div>
    </div>
  );
};
