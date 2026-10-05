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
        return <Upload className="w-3.5 h-3.5 text-blue-600" />;
      case 'hash_generated':
      case 'integrity_verified':
        return <Hash className="w-3.5 h-3.5 text-emerald-600" />;
      case 'evidence_validated':
        return <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />;
      case 'analysis_started':
        return <Play className="w-3.5 h-3.5 text-amber-600" />;
      case 'analysis_completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'investigator_reviewed':
        return <Eye className="w-3.5 h-3.5 text-purple-600" />;
      case 'note_added':
      case 'annotation_added':
        return <MessageSquare className="w-3.5 h-3.5 text-sky-600" />;
      case 'report_generated':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case 'integrity_mismatch':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    if (eventType.includes('mismatch')) return 'border-rose-200 bg-rose-50 text-rose-700';
    if (eventType.includes('completed') || eventType.includes('verified')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (eventType.includes('started')) return 'border-amber-200 bg-amber-50 text-amber-700';
    if (eventType.includes('reviewed')) return 'border-purple-200 bg-purple-50 text-purple-700';
    return 'border-blue-200 bg-blue-50 text-blue-700';
  };

  const toggleExpand = (id: string) => {
    setExpandedEventId(expandedEventId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-medium">Loading evidence audit trail...</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-12 px-6 text-center border border-slate-200 rounded-2xl bg-white shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <Info className="w-6 h-6" />
        </div>
        <h4 className="text-sm text-slate-800 font-semibold">No timeline events recorded yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
          Audit events are automatically recorded upon evidence upload, SHA-256 computation, neural model analysis, investigator notes, and report generation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200/80">
        <span className="font-bold uppercase tracking-wider text-slate-800">
          Evidence Lifecycle Timeline ({events.length} Event{events.length !== 1 ? 's' : ''})
        </span>
        <span className="text-[11px] text-slate-400">Chronological Audit Sequence</span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-blue-500 before:via-slate-200 before:to-slate-200">
        {events.map((event, idx) => {
          const isExpanded = expandedEventId === event.id;
          const formattedDate = new Date(event.created_at).toLocaleString();

          return (
            <motion.div 
              key={event.id || idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.2 }}
              className="relative group"
            >
              {/* Event node dot */}
              <div className="absolute -left-[30px] top-3 w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                {getEventIcon(event.event_type)}
              </div>

              {/* Event card */}
              <div 
                onClick={() => toggleExpand(event.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isExpanded 
                    ? 'bg-white border-blue-400 shadow-sm ring-2 ring-blue-500/10' 
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {event.title}
                      </span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono uppercase font-semibold tracking-wider ${getEventBadgeColor(event.event_type)}`}>
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-right shrink-0">
                    <span className="text-[11px] font-mono text-slate-500 font-medium">
                      {formattedDate}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
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
                      className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-500 font-medium">Event ID:</span>{' '}
                          <span className="font-mono text-slate-800 font-semibold">{event.id}</span>
                        </div>
                        {event.evidence_id && (
                          <div>
                            <span className="text-slate-500 font-medium">Evidence ID:</span>{' '}
                            <span className="font-mono text-slate-800 font-semibold">{event.evidence_id}</span>
                          </div>
                        )}
                        {event.user_id && (
                          <div>
                            <span className="text-slate-500 font-medium">Actor ID:</span>{' '}
                            <span className="font-mono text-slate-800 font-semibold">{event.user_id}</span>
                          </div>
                        )}
                      </div>

                      {event.metadata_json && Object.keys(event.metadata_json).length > 0 && (
                        <div className="mt-2">
                          <span className="text-[11px] text-slate-700 font-bold block mb-1">
                            Event Context &amp; Metadata:
                          </span>
                          <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-36">
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
