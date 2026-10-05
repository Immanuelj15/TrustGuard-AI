import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimelineEvent } from '../../types';
import { 
  Upload, 
  Hash, 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  Eye, 
  FileText, 
  MessageSquare, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Info
} from 'lucide-react';

interface EvidenceTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

export const EvidenceTimelineComponent: React.FC<EvidenceTimelineProps> = ({ events, loading }) => {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'evidence_uploaded':
        return <Upload className="w-4 h-4 text-cyan-400" />;
      case 'hash_generated':
      case 'integrity_verified':
        return <Hash className="w-4 h-4 text-emerald-400" />;
      case 'evidence_validated':
        return <ShieldCheck className="w-4 h-4 text-blue-400" />;
      case 'analysis_started':
        return <Play className="w-4 h-4 text-amber-400" />;
      case 'analysis_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'investigator_reviewed':
        return <Eye className="w-4 h-4 text-purple-400" />;
      case 'note_added':
      case 'annotation_added':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'report_generated':
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'integrity_mismatch':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    if (eventType.includes('mismatch')) return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
    if (eventType.includes('completed') || eventType.includes('verified')) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    if (eventType.includes('started')) return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    if (eventType.includes('reviewed')) return 'border-purple-500/30 bg-purple-500/10 text-purple-400';
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400';
  };

  const toggleExpand = (id: string) => {
    setExpandedEventId(expandedEventId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs">Loading evidence audit trail...</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-10 px-4 text-center border border-slate-800/80 rounded-xl bg-slate-900/30">
        <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm text-slate-300 font-medium">No timeline events recorded yet</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Audit events are automatically recorded upon evidence upload, hashing, model analysis, investigator notes, and report generation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/80">
        <span className="font-semibold uppercase tracking-wider text-slate-300">
          Evidence Lifecycle Timeline ({events.length} Event{events.length !== 1 ? 's' : ''})
        </span>
        <span className="text-[11px] text-slate-500">Chronological Audit Sequence</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-cyan-500/40 before:via-slate-700 before:to-slate-800">
        {events.map((event, idx) => {
          const isExpanded = expandedEventId === event.id;
          const formattedDate = new Date(event.created_at).toLocaleString();

          return (
            <motion.div 
              key={event.id || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.2 }}
              className="relative group"
            >
              {/* Event node dot */}
              <div className="absolute -left-[30px] top-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-md group-hover:border-cyan-400 transition-colors">
                {getEventIcon(event.event_type)}
              </div>

              {/* Event card */}
              <div 
                onClick={() => toggleExpand(event.id)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isExpanded 
                    ? 'bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-950/20' 
                    : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {event.title}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase tracking-wider ${getEventBadgeColor(event.event_type)}`}>
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-right shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      {formattedDate}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                    )}
                  </div>
                </div>

                {/* Expanded metadata drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-slate-800/80 text-xs space-y-2 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500">Event ID:</span>{' '}
                          <span className="font-mono text-slate-300">{event.id}</span>
                        </div>
                        {event.evidence_id && (
                          <div>
                            <span className="text-slate-500">Evidence ID:</span>{' '}
                            <span className="font-mono text-slate-300">{event.evidence_id}</span>
                          </div>
                        )}
                        {event.user_id && (
                          <div>
                            <span className="text-slate-500">Actor ID:</span>{' '}
                            <span className="font-mono text-slate-300">{event.user_id}</span>
                          </div>
                        )}
                      </div>

                      {event.metadata_json && Object.keys(event.metadata_json).length > 0 && (
                        <div className="mt-2">
                          <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                            Event Context & Metadata:
                          </span>
                          <pre className="p-2 rounded bg-black/40 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-32">
                            {JSON.stringify(event.metadata_json, null, 2)}
                          </pre>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
