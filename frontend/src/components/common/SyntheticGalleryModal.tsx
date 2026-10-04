import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { SyntheticSample, SyntheticManifest } from '../../types';
import { Badge } from './Badge';
import { LoadingState } from './LoadingState';
import {
  Sparkles,
  X,
  Search,
  FileCode,
  FileAudio,
  FileVideo,
  Layers,
  PlusCircle,
  Play,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';

interface SyntheticGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
  onSampleAttached?: (sample: SyntheticSample) => void;
  onSelectForAnalysis?: (sample: SyntheticSample) => void;
}

export const SyntheticGalleryModal: React.FC<SyntheticGalleryModalProps> = ({
  isOpen,
  onClose,
  caseId,
  onSampleAttached,
  onSelectForAnalysis
}) => {
  const [samples, setSamples] = useState<SyntheticSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'text' | 'audio' | 'video' | 'multimodal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchSamples = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<SyntheticSample[]>('/demo/samples?limit=150');
        setSamples(res.data);
      } catch (err) {
        console.error('Failed to load synthetic samples', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSamples();
  }, [isOpen]);

  const handleAttach = async (sample: SyntheticSample) => {
    if (!caseId) return;
    setAttachingId(sample.sample_id);
    try {
      await apiClient.post('/demo/load-to-case', {
        case_id: caseId,
        sample_id: sample.sample_id
      });
      setSuccessMessage(`Attached ${sample.sample_id} to case vault.`);
      if (onSampleAttached) onSampleAttached(sample);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Failed to attach sample', err);
    } finally {
      setAttachingId(null);
    }
  };

  const filteredSamples = samples.filter((s) => {
    const matchesTab = activeTab === 'all' || s.modality === activeTab;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sample_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Synthetic Demonstration Dataset Gallery
              </h2>
              <span className="text-[10px] uppercase font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                Demo Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Curated, safe demonstration assets generated via local TTS, OpenCV video frames, and scam text templates.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Academic Notice Banner */}
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-100 flex items-start gap-2.5 text-[11px] text-amber-900">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Academic Demo Provenance:</span> All assets in this gallery are synthetic samples created for algorithmic testing. None contain real victim records or real personal identities.
          </div>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 py-2 bg-emerald-50 border-b border-emerald-100 text-xs font-semibold text-emerald-800 flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls: Modality Filter & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Assets ({samples.length})
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'text' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Text ({samples.filter((s) => s.modality === 'text').length})
            </button>
            <button
              onClick={() => setActiveTab('audio')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'audio' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audio ({samples.filter((s) => s.modality === 'audio').length})
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'video' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Video ({samples.filter((s) => s.modality === 'video').length})
            </button>
            <button
              onClick={() => setActiveTab('multimodal')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'multimodal' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Multimodal ({samples.filter((s) => s.modality === 'multimodal').length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search synthetic samples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Samples List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-16">
              <LoadingState message="Loading synthetic demonstration benchmark..." />
            </div>
          ) : filteredSamples.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium">
              No synthetic samples match the active search or category filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSamples.map((sample) => (
                <div
                  key={sample.sample_id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {sample.modality === 'text' && <FileCode className="w-4 h-4 text-blue-600" />}
                        {sample.modality === 'audio' && <FileAudio className="w-4 h-4 text-purple-600" />}
                        {sample.modality === 'video' && <FileVideo className="w-4 h-4 text-sky-600" />}
                        {sample.modality === 'multimodal' && <Layers className="w-4 h-4 text-indigo-600" />}
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {sample.sample_id}
                        </span>
                      </div>
                      <Badge
                        variant={
                          sample.label.includes('scam') || sample.label.includes('transformed') || sample.label.includes('mismatched')
                            ? 'amber'
                            : 'green'
                        }
                      >
                        {sample.label.replace('synthetic_', '').replace('_demo', '')}
                      </Badge>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {sample.title}
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 italic font-sans leading-normal">
                      "{sample.summary}"
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-medium">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
                        {sample.category}
                      </span>
                      {sample.duration_seconds && (
                        <span>{sample.duration_seconds}s</span>
                      )}
                      {sample.transformation && (
                        <span className="text-slate-500 font-mono">[{sample.transformation}]</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    {onSelectForAnalysis && (
                      <button
                        onClick={() => {
                          onSelectForAnalysis(sample);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Inspect in Workspace</span>
                      </button>
                    )}

                    {caseId && (
                      <button
                        onClick={() => handleAttach(sample)}
                        disabled={attachingId === sample.sample_id}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        {attachingId === sample.sample_id ? (
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <PlusCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Attach to Case Vault</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>TrustGuard AI Academic Dataset Benchmark (v1.0)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition"
          >
            Close Gallery
          </button>
        </div>
      </motion.div>
    </div>
  );
};
