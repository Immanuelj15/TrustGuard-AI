import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { AuditLog } from '../types';
import {
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  X
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
      <div className="pb-2 border-b border-[#17223b]">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-cyan-400" />
          <span>Immutable System Audit Trail</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          CRYPTOGRAPHIC EVIDENCE ACCESS, ACTION TRACEABILITY & OPERATIONAL COMPLIANCE LOGS
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-[#0c1222] border border-[#17223b] flex items-center justify-between">
        <form onSubmit={handleFilterSubmit} className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by action (e.g. EVIDENCE, REPORT)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </form>

        <span className="text-xs font-mono text-slate-400">
          {logs.length} logged events
        </span>
      </div>

      {/* Table */}
      <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No audit records matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b14] text-slate-400 uppercase font-mono border-b border-[#17223b]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Action Identifier</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Case / Evidence Target</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17223b]/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#11192e]/60 transition">
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-cyan-300">
                      {log.action}
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {log.user_email || 'System Daemon'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {log.case_id ? `Case: ${log.case_id.substring(0, 8)}...` : 'Global System'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase ${
                        log.outcome === 'success' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {log.outcome === 'success' ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{log.outcome}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {log.metadata_json && Object.keys(log.metadata_json).length > 0 ? (
                        <button
                          onClick={() => setSelectedMeta(log.metadata_json)}
                          className="px-2.5 py-1 rounded bg-[#17223b] hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                        >
                          Inspect Meta
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px] font-mono">—</span>
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
      {selectedMeta && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0c1222] border border-[#17223b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#17223b]">
              <h2 className="text-sm font-semibold text-slate-100 font-mono">
                AUDIT METADATA PAYLOAD
              </h2>
              <button onClick={() => setSelectedMeta(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-[#070b14] border border-[#17223b] text-xs font-mono text-cyan-300 overflow-x-auto max-h-96">
              {JSON.stringify(selectedMeta, null, 2)}
            </pre>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedMeta(null)}
                className="px-4 py-2 rounded-lg bg-[#11192e] text-slate-300 hover:text-white text-xs font-medium"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
