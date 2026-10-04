import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { DashboardSummary, DashboardCharts, Case } from '../types';
import {
  FolderLock,
  FileCheck2,
  AlertOctagon,
  Clock,
  ShieldCheck,
  PlusCircle,
  PhoneCall,
  ArrowUpRight,
  TrendingUp,
  Activity,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, chartRes, casesRes] = await Promise.all([
          apiClient.get<DashboardSummary>('/dashboard/summary'),
          apiClient.get<DashboardCharts>('/dashboard/charts'),
          apiClient.get<Case[]>('/cases?limit=5')
        ]);
        setSummary(sumRes.data);
        setCharts(chartRes.data);
        setRecentCases(casesRes.data);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-cyan-400">LOADING FORENSIC METRICS...</span>
        </div>
      </div>
    );
  }

  // Format chart data
  const statusChartData = charts ? Object.entries(charts.cases_by_status).map(([k, v]) => ({
    name: k.replace('_', ' ').toUpperCase(),
    count: v
  })) : [];

  const evidenceChartData = charts ? Object.entries(charts.evidence_by_type).map(([k, v]) => ({
    name: k.toUpperCase(),
    value: v
  })) : [];

  const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#17223b]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Investigation Operations Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            LIVE TELEMETRY // AI DIGITAL EVIDENCE ASSISTANCE PLATFORM
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cases?new=true')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-md shadow-cyan-950"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Case</span>
          </button>
          <button
            onClick={() => navigate('/caller-check')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#11192e] border border-[#1e2e4e] hover:border-cyan-500/50 text-slate-200 text-xs font-medium transition"
          >
            <PhoneCall className="w-4 h-4 text-cyan-400" />
            <span>Check Number</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Cases */}
        <div className="p-4 rounded-xl bg-[#0c1222]/90 border border-[#17223b] shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">TOTAL CASES</span>
            <FolderLock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{summary?.total_cases || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Logged incidents</div>
        </div>

        {/* Active Open Cases */}
        <div className="p-4 rounded-xl bg-[#0c1222]/90 border border-[#17223b] shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">OPEN CASES</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">{summary?.open_cases || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Under ongoing investigation</div>
        </div>

        {/* Evidence Analysed */}
        <div className="p-4 rounded-xl bg-[#0c1222]/90 border border-[#17223b] shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">EVIDENCE FILES</span>
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300">{summary?.evidence_analyzed || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">SHA-256 hashed & analyzed</div>
        </div>

        {/* High Risk Findings */}
        <div className="p-4 rounded-xl bg-[#0c1222]/90 border border-[#17223b] shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">HIGH RISK ALERTS</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">{summary?.high_risk_findings || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Severe indicators flagged</div>
        </div>

        {/* Active Investigators */}
        <div className="p-4 rounded-xl bg-[#0c1222]/90 border border-[#17223b] shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">INVESTIGATORS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">{summary?.active_investigators || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Authorized personnel</div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases By Status */}
        <div className="p-5 rounded-xl bg-[#0c1222]/90 border border-[#17223b] shadow-lg">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Cases Distribution by Status</span>
            </span>
            <span className="text-xs font-mono text-slate-500">LIVE DB</span>
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070b14', borderColor: '#17223b', borderRadius: '8px' }}
                  labelStyle={{ color: '#06b6d4', fontFamily: 'monospace' }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evidence Types Breakdown */}
        <div className="p-5 rounded-xl bg-[#0c1222]/90 border border-[#17223b] shadow-lg">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Evidence Ingestion by Media Type</span>
            </span>
            <span className="text-xs font-mono text-slate-500">VERIFIED VAULT</span>
          </h2>
          <div className="h-56 flex items-center justify-center">
            {evidenceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={evidenceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {evidenceChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#070b14', borderColor: '#17223b', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs font-mono text-slate-500">No evidence items logged yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Cases & Audit Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases (2 columns) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0c1222]/90 border border-[#17223b] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-cyan-400" />
              <span>Recent Cybercrime Cases</span>
            </h2>
            <Link to="/cases" className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b14] text-slate-400 uppercase font-mono border-b border-[#17223b]">
                <tr>
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Title & Category</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Evidence</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17223b]/60">
                {recentCases.map((c) => (
                  <tr key={c.id} className="hover:bg-[#11192e]/60 transition">
                    <td className="py-3 px-3 font-mono font-medium text-cyan-400">{c.case_number}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200">{c.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{c.complaint_category}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        c.priority === 'critical' ? 'bg-red-950 text-red-400 border border-red-800' :
                        c.priority === 'high' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                        'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {c.status.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{c.evidence_count || 0} items</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate(`/cases/${c.id}`)}
                        className="px-2.5 py-1 rounded bg-[#17223b] hover:bg-cyan-900/60 hover:text-cyan-300 text-slate-300 transition text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Stream (1 column) */}
        <div className="p-5 rounded-xl bg-[#0c1222]/90 border border-[#17223b] shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Immutable Audit Stream</span>
            </h2>
            <Link to="/audit-logs" className="text-xs font-mono text-cyan-400 hover:underline">
              Logs
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {charts?.recent_activity.map((log) => (
              <div key={log.id} className="p-2.5 rounded bg-[#070b14] border border-[#17223b] text-xs">
                <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] mb-1">
                  <span className="text-cyan-300 font-semibold">{log.action}</span>
                  <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  User: {log.user_email || 'System'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
