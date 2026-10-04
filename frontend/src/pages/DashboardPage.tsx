import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../api/client';
import { DashboardSummary, DashboardCharts, Case } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import {
  FolderLock,
  FileCheck2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  PlusCircle,
  PhoneCall,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Layers
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
      <div className="py-24">
        <LoadingState message="Aggregating cybercrime intelligence & evidence vault telemetry..." />
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

  const PALETTE = ['#2563EB', '#38BDF8', '#818CF8', '#F59E0B', '#10B981', '#EC4899'];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header and Quick Actions */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Investigation Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time digital forensics telemetry, case progression, and neural evidence analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/cases?new=true')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Case</span>
          </button>
          <button
            onClick={() => navigate('/caller-check')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <PhoneCall className="w-4 h-4 text-blue-600" />
            <span>Verify Number</span>
          </button>
        </div>
      </motion.div>

      {/* KPI Cards Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Cases */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Total Cases</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderLock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{summary?.total_cases || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Logged cyber incidents</div>
        </div>

        {/* Active Open Cases */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Open Cases</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">{summary?.open_cases || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Active investigation</div>
        </div>

        {/* Evidence Ingested */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Evidence Files</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-600">{summary?.evidence_analyzed || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">SHA-256 hashed items</div>
        </div>

        {/* High Risk Flags */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Risk Alerts</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">{summary?.high_risk_findings || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Severe indicators flagged</div>
        </div>

        {/* Active Investigators */}
        <div className="surface-card p-4 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Investigators</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{summary?.active_investigators || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Authorized personnel</div>
        </div>
      </motion.div>

      {/* Visual Analytics Charts */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases Distribution by Status */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Case Volume by Investigation Status</span>
            </h2>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Live Database</span>
          </div>
          <div className="h-60">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderColor: '#E2E8F0', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No case data" message="Create cases to visualize status distribution" />
            )}
          </div>
        </div>

        {/* Evidence Types Breakdown */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Evidence Ingestion by Media Category</span>
            </h2>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Vault Registry</span>
          </div>
          <div className="h-60 flex items-center justify-center">
            {evidenceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={evidenceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {evidenceChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderColor: '#E2E8F0', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No evidence logged" message="Upload evidence to view media breakdown" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Two Column Section: Recent Cases & Audit Activity Stream */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases (2 columns) */}
        <div className="lg:col-span-2 surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-blue-600" />
              <span>Recent Cybercrime Cases</span>
            </h2>
            <Link 
              to="/cases" 
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View all cases</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentCases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Case ID</th>
                    <th className="py-2.5 px-3">Title & Category</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Evidence</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentCases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-semibold text-blue-600">{c.case_number}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{c.title}</div>
                        <div className="text-[10px] text-slate-500">{c.complaint_category}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="priority" value={c.priority} />
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="status" value={c.status} />
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600">
                        {c.evidence_count || 0} items
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate(`/cases/${c.id}`)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition text-[11px]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState 
              title="No cases registered" 
              message="Register your first case incident to initiate investigations" 
              actionLabel="Create First Case"
              onAction={() => navigate('/cases?new=true')}
            />
          )}
        </div>

        {/* Audit Stream (1 column) */}
        <div className="surface-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Immutable Audit Stream</span>
            </h2>
            <Link to="/audit-logs" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Audit Logs
            </Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px]">
            {charts?.recent_activity && charts.recent_activity.length > 0 ? (
              charts.recent_activity.map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1 font-mono">
                    <span className="font-semibold text-blue-700">{log.action}</span>
                    <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    Officer: <span className="text-slate-800 font-medium">{log.user_email || 'System Daemon'}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No logs found" message="Actions are captured as forensic audit entries" />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
