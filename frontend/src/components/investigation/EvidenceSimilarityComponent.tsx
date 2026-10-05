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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          EXACT DUPLICATE (100%)
        </span>
      );
    }
    if (score >= 90) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {score}% &bull; Highly Similar
        </span>
      );
    }
    if (score >= 75) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
          {score}% &bull; Related
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
          {score}% &bull; Possibly Related
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono">
        {score}% &bull; Low Similarity
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-medium">Computing pairwise TF-IDF cosine similarity...</p>
      </div>
    );
  }

  if (!similarities || similarities.length === 0) {
    return (
      <div className="py-12 px-6 text-center border border-slate-200 rounded-2xl bg-white shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="text-sm text-slate-800 font-semibold">Insufficient evidence for pairwise comparison</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
          Add at least two text or transcribed audio evidence items to compare pairwise content similarity and exact file duplicates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Pairwise Evidence Similarity &amp; Duplicate Analysis
            </h4>
            <p className="text-xs text-slate-500">
              Scikit-learn TF-IDF + Cosine Distance with SHA-256 byte comparison
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
          {similarities.length} Comparison Pair{similarities.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {similarities.map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border transition-all ${
              item.is_exact_duplicate
                ? 'bg-rose-50/50 border-rose-200 shadow-2xs'
                : item.similarity_score >= 75
                ? 'bg-blue-50/30 border-blue-200 shadow-2xs'
                : 'bg-white border-slate-200/90 shadow-2xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                  <span className="font-bold text-slate-900">{item.evidence_1_name}</span>
                  <span className="text-slate-400 font-normal">&harr;</span>
                  <span className="font-bold text-slate-900">{item.evidence_2_name}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>Method: <strong className="text-slate-700 font-semibold">{item.comparison_method}</strong></span>
                </div>
              </div>

              <div className="shrink-0">
                {getScoreBadge(item.similarity_score, item.relation_label, item.is_exact_duplicate)}
              </div>
            </div>

            {/* Similarity bar */}
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.is_exact_duplicate
                    ? 'bg-rose-500'
                    : item.similarity_score >= 75
                    ? 'bg-gradient-to-r from-blue-500 to-emerald-500'
                    : 'bg-slate-400'
                }`}
                style={{ width: `${item.similarity_score}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Forensic Disclaimer */}
      <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-700">Investigative Notice:</strong> Text similarity metrics are heuristic indicators to accelerate investigation and detect copy-paste or templatized lure messages. High similarity does not prove identical authorship or source attribution.
        </p>
      </div>
    </div>
  );
};
