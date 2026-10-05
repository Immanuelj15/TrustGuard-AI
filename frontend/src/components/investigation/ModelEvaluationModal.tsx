import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '../../api/client';
import { ModelEvaluationDashboardData, ModelMetric } from '../../types';
import { Cpu, ShieldAlert, CheckCircle2, Clock, Info, X, Activity } from 'lucide-react';

interface ModelEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelEvaluationModal: React.FC<ModelEvaluationModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<ModelEvaluationDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      apiClient
        .get<ModelEvaluationDashboardData>('/models/evaluation')
        .then((res) => setData(res.data))
        .catch((err) => {
          console.error('Failed to load evaluation data', err);
          setError('Failed to load model evaluation metrics.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE MODEL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            LIVE MODEL
          </span>
        );
      case 'EVALUATED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            EVALUATED
          </span>
        );
      case 'DEMO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            DEMO HEURISTIC
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            NOT EVALUATED
          </span>
        );
    }
  };

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
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Model Evaluation &amp; Empirical Benchmark Dashboard
              </h3>
              <p className="text-[11px] text-slate-400">
                Transparent verification of real inference latency, classification performance, and empirical metrics
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading model evaluation telemetry...
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Models Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.models.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 font-mono">
                          {m.model_name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono">ID: {m.model_id}</p>
                        <p className="text-[11px] text-cyan-400">Task: {m.task}</p>
                      </div>
                      {getStatusBadge(m.evaluation_status)}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {m.accuracy !== undefined && (
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Accuracy</span>
                          <span className="text-slate-200 font-bold">
                            {(m.accuracy * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {m.precision !== undefined && (
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Precision</span>
                          <span className="text-slate-200 font-bold">
                            {(m.precision * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {m.recall !== undefined && (
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Recall</span>
                          <span className="text-slate-200 font-bold">
                            {(m.recall * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {m.f1_score !== undefined && (
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">F1-Score</span>
                          <span className="text-emerald-400 font-bold">
                            {(m.f1_score * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {m.inference_latency_ms !== undefined && (
                        <div className="p-2 rounded bg-slate-900 border border-slate-800 col-span-2">
                          <span className="text-[10px] text-slate-500 block">Typical Latency</span>
                          <span className="text-cyan-300 font-bold">
                            ~{m.inference_latency_ms} ms (CPU)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confusion matrix if present */}
                    {m.confusion_matrix && (
                      <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono space-y-1">
                        <span className="text-slate-400 font-semibold block">Confusion Matrix (Validation Split):</span>
                        <div className="grid grid-cols-2 gap-1 text-center">
                          <div className="bg-slate-950 p-1 rounded border border-slate-800">
                            TP: <strong className="text-emerald-400">{m.confusion_matrix.tp}</strong>
                          </div>
                          <div className="bg-slate-950 p-1 rounded border border-slate-800">
                            FP: <strong className="text-rose-400">{m.confusion_matrix.fp}</strong>
                          </div>
                          <div className="bg-slate-950 p-1 rounded border border-slate-800">
                            FN: <strong className="text-rose-400">{m.confusion_matrix.fn}</strong>
                          </div>
                          <div className="bg-slate-950 p-1 rounded border border-slate-800">
                            TN: <strong className="text-emerald-400">{m.confusion_matrix.tn}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 space-y-1">
                      <p>
                        <strong className="text-slate-300">Dataset:</strong> {m.dataset_description}
                      </p>
                      <p className="text-slate-500 italic">{m.disclaimer}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Integrity & Ethics Alert */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Academic &amp; Forensic Integrity:</strong> TrustGuard AI strictly refrains from fabricating accuracy numbers. Real-world scam variants and audio noise distributions deviate from benchmark datasets. All classifiers must be interpreted as investigative screening filters.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
};
