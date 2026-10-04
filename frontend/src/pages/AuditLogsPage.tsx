import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { AuditLog } from '../types';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import {
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  X,
  FileCode,
  ShieldCheck
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedMeta, setSelectedMeta] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      const res = await apiClient.get<AuditLog[]>(`/audit-logs?${params.toString()}`);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <span>Immutable System Audit Trail</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Cryptographic evidence access trace, officer action tracking, and forensic compliance records.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form onSubmit={handleFilterSubmit} className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by action (e.g. EVIDENCE, REPORT, LOGIN)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </form>

        <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          {logs.length} logged forensic events
        </span>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingState message="Retrieving cryptographic audit trail..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={ShieldAlert}
              title="No audit records matching criteria"
              message="Modify your filter terms or trigger system actions to observe live audit logs."
              actionLabel="Reset Filter"
              onAction={() => { setActionFilter(''); fetchLogs(); }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action Identifier</th>
                  <th className="py-3 px-4">Operator / Officer</th>
                  <th className="py-3 px-4">Target Scope</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {log.user_email || 'System Daemon'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {log.case_id ? `Case: ${log.case_id.substring(0, 8)}...` : 'Global System'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 font-semibold text-[11px] uppercase ${
                        log.outcome === 'success' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {log.outcome === 'success' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{log.outcome}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {log.metadata_json && Object.keys(log.metadata_json).length > 0 ? (
                        <button
                          onClick={() => setSelectedMeta(log.metadata_json)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition"
                        >
                          Inspect Meta
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata Inspector Modal */}
      <AnimatePresence>
        {selectedMeta && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-600" />
                  <span>Audit Metadata Payload</span>
                </h2>
                <button 
                  onClick={() => setSelectedMeta(null)} 
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed shadow-inner">
                {JSON.stringify(selectedMeta, null, 2)}
              </pre>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedMeta(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
