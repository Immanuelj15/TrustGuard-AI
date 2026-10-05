import React from 'react';
import { EvidenceSimilarity } from '../../types';
import { Layers, Copy, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface EvidenceSimilarityProps {
  similarities: EvidenceSimilarity[];
  loading?: boolean;
}

export const EvidenceSimilarityComponent: React.FC<EvidenceSimilarityProps> = ({
  similarities,
  loading,
}) => {
  const getScoreBadge = (score: number, label: string, isExact: boolean) => {
    if (isExact) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
          <AlertTriangle className="w-3 h-3" />
          EXACT DUPLICATE (100%)
        </span>
      );
    }
    if (score >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
          {score}% &bull; Very Similar
        </span>
      );
    }
    if (score >= 75) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
          {score}% &bull; Related
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
          {score}% &bull; Possibly Related
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 font-mono">
        {score}% &bull; Low Similarity
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs">Computing pairwise TF-IDF cosine similarity...</p>
      </div>
    );
  }

  if (!similarities || similarities.length === 0) {
    return (
      <div className="py-12 text-center border border-slate-800 rounded-xl bg-slate-900/30">
        <Layers className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm text-slate-300 font-medium">Insufficient evidence for pairwise comparison</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Add at least two text or transcribed audio evidence items to compare pairwise content similarity and exact file duplicates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Pairwise Evidence Similarity &amp; Duplicate Analysis
            </h4>
            <p className="text-[11px] text-slate-400">
              Scikit-learn TF-IDF + Cosine Distance with SHA-256 byte comparison
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {similarities.length} Comparison Pair{similarities.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2.5">
        {similarities.map((item, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-lg border transition-all ${
              item.is_exact_duplicate
                ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                : item.similarity_score >= 75
                ? 'bg-slate-900/80 border-cyan-500/30'
                : 'bg-slate-900/40 border-slate-800/80'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-slate-200">
                  <span className="font-semibold text-cyan-300">{item.evidence_1_name}</span>
                  <span className="text-slate-500">&harr;</span>
                  <span className="font-semibold text-cyan-300">{item.evidence_2_name}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>Method: <strong className="text-slate-300">{item.comparison_method}</strong></span>
                </div>
              </div>

              <div className="shrink-0">
                {getScoreBadge(item.similarity_score, item.relation_label, item.is_exact_duplicate)}
              </div>
            </div>

            {/* Similarity bar */}
            <div className="mt-3 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.is_exact_duplicate
                    ? 'bg-rose-500'
                    : item.similarity_score >= 75
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                    : 'bg-slate-600'
                }`}
                style={{ width: `${item.similarity_score}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Forensic Disclaimer */}
      <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>Investigative Notice:</strong> Text similarity metrics are heuristic indicators to accelerate investigation and detect copy-paste or templatized lure messages. High similarity does not prove identical authorship or source attribution.
        </p>
      </div>
    </div>
  );
};
