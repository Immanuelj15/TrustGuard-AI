import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { DashboardSummary, DashboardCharts, Case } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { SyntheticGalleryModal } from '../components/common/SyntheticGalleryModal';
import { AdminUsersModal } from '../components/common/AdminUsersModal';
import { ModelEvaluationModal } from '../components/investigation/ModelEvaluationModal';
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
  Layers,
  Users,
  Sliders,
  Sparkles,
  Shield,
  Eye,
  CheckCircle2,
  FileText,
  Binary
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
  const { user, isAdmin, isInvestigator, isReviewer, isDemo } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showAdminUsersModal, setShowAdminUsersModal] = useState(false);
  const [showModelEvalModal, setShowModelEvalModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, chartRes, casesRes] = await Promise.all([
          apiClient.get<DashboardSummary>('/dashboard/summary'),
          apiClient.get<DashboardCharts>('/dashboard/charts'),
          apiClient.get<Case[]>('/cases?limit=6')
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
  const statusChartData = charts
    ? Object.entries(charts.cases_by_status).map(([k, v]) => ({
        name: k.replace('_', ' ').toUpperCase(),
        count: v
      }))
    : [];

  const evidenceChartData = charts
    ? Object.entries(charts.evidence_by_type).map(([k, v]) => ({
        name: k.toUpperCase(),
        value: v
      }))
    : [];

  const PALETTE = ['#2563EB', '#38BDF8', '#818CF8', '#F59E0B', '#10B981', '#EC4899'];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* 1. ROLE-SPECIFIC HEADER & ACTIONS */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {isAdmin && 'System Forensics Oversight & Administration'}
              {isReviewer && 'Evidence Review Queue & Verification'}
              {isDemo && 'Demonstration & Evaluation Dashboard'}
              {!isAdmin && !isReviewer && !isDemo && 'Forensic Investigation Dashboard'}
            </h1>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                isAdmin
                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                  : isReviewer
                  ? 'bg-teal-100 text-teal-700 border-teal-200'
                  : isDemo
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}
            >
              {user?.role}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin && 'System-wide case distribution, user access controls, and forensic model telemetry.'}
            {isReviewer && 'Review pending cases, verify SHA-256 evidence integrity, and validate findings.'}
            {isDemo && '530+ safe synthetic demonstration samples for academic testing and model exploration.'}
            {!isAdmin && !isReviewer && !isDemo && 'Active case tracking, multi-modal evidence analysis, and IOC extraction.'}
          </p>
        </div>

        {/* Action Buttons tailored to role */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => setShowAdminUsersModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Users className="w-3.5 h-3.5" />
                <span>User Roster</span>
              </button>
              <button
                onClick={() => setShowModelEvalModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-600" />
                <span>Model Telemetry</span>
              </button>
            </>
          )}

          {isInvestigator && !isAdmin && (
            <>
              <button
                onClick={() => navigate('/cases?new=true')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Case</span>
              </button>
              <button
                onClick={() => navigate('/analysis')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
              >
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                <span>Analysis Workspace</span>
              </button>
            </>
          )}

          {isReviewer && (
            <>
              <button
                onClick={() => navigate('/cases?status=awaiting_review')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Eye className="w-4 h-4" />
                <span>Review Pending Cases</span>
              </button>
              <button
                onClick={() => navigate('/analysis')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Verify Integrity</span>
              </button>
            </>
          )}

          {isDemo && (
            <>
              <button
                onClick={() => setShowGalleryModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Browse Synthetic Gallery</span>
              </button>
              <button
                onClick={() => navigate('/analysis')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
              >
                <Activity className="w-3.5 h-3.5 text-amber-600" />
                <span>Demo Analysis</span>
              </button>
            </>
          )}

          <button
            onClick={() => navigate('/caller-check')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
          >
            <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
            <span>Verify Caller</span>
          </button>
        </div>
      </motion.div>

      {/* 2. DEMO BANNER IF DEMO USER */}
      {isDemo && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block font-mono">
              Academic Demonstration & Testing Environment
            </span>
            <p className="text-amber-800 leading-relaxed font-sans">
              All data presented in this demo environment is synthetic and safely constructed for research evaluation.
              Real criminal complaints and live evidence files are strictly quarantined in isolated non-demo storage.
            </p>
          </div>
        </motion.div>
      )}

      {/* 3. KPI CARDS GRID (ROLE-AWARE METRICS) */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1 */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              {isAdmin ? 'System Cases' : isReviewer ? 'Total Inquiries' : 'Total Cases'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderLock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{summary?.total_cases ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium font-sans">Logged incidents</div>
        </div>

        {/* Metric 2 */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              {isReviewer ? 'Review Queue' : 'Open Inquiries'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {isReviewer
              ? charts?.cases_by_status?.awaiting_review ?? summary?.cases_awaiting_review ?? 0
              : summary?.open_investigations ?? summary?.open_cases ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium font-sans">
            {isReviewer ? 'Awaiting verification' : 'Active casework'}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase">Evidence Items</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-600">
            {summary?.total_evidence ?? summary?.evidence_analyzed ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium font-sans">Hashed artifacts</div>
        </div>

        {/* Metric 4 */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase">Analyzed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{summary?.evidence_analyzed ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium font-sans">Models executed</div>
        </div>

        {/* Metric 5 */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase">High-Risk</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">{summary?.high_risk_findings ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium font-sans">Severe indicators</div>
        </div>

        {/* Metric 6 */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              {isAdmin ? 'Operators' : 'IOCs Discovered'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              {isAdmin ? <Users className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {isAdmin ? summary?.active_investigators ?? 4 : summary?.iocs_found ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium font-sans">
            {isAdmin ? 'Active system users' : 'Extracted indicators'}
          </div>
        </div>
      </motion.div>

      {/* 4. ANALYTICS & STATUS CHARTS */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Case Status Distribution</span>
            </h2>
            <span className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Database</span>
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
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No case data available" description="Record an investigation case to render telemetry." />
            )}
          </div>
        </div>

        {/* Evidence Breakdown */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <span>Evidence Modality Ratio</span>
            </h2>
            <span className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Vault</span>
          </div>
          <div className="h-60 flex items-center justify-center">
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
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No evidence ingested" description="Upload digital artifacts to inspect modalities." />
            )}
          </div>
        </div>

        {/* Recent Audit / System Activity */}
        <div className="surface-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{isAdmin ? 'System Audit Trail' : isReviewer ? 'Integrity Log' : 'Recent Activity'}</span>
            </h2>
            <Link
              to="/audit-logs"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-60 pr-1">
            {charts?.recent_activity && charts.recent_activity.length > 0 ? (
              charts.recent_activity.slice(0, 5).map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {log.user_email || 'System'} • {log.outcome}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">No recent activity logged.</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 5. RECENT INVESTIGATION CASES TABLE */}
      <motion.div variants={itemVariants} className="surface-card overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {isReviewer ? 'Reviewable Investigation Inquiries' : 'Recent Case Inquiries'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isReviewer
                ? 'Investigations awaiting peer review and chain of custody integrity check.'
                : 'Active cybercrime investigations registered in the evidence vault.'}
            </p>
          </div>
          <Link
            to="/cases"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Browse Case Directory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentCases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-5">Case Identifier</th>
                  <th className="py-2.5 px-5">Title & Category</th>
                  <th className="py-2.5 px-5">Priority</th>
                  <th className="py-2.5 px-5">Status</th>
                  <th className="py-2.5 px-5">Evidence Count</th>
                  <th className="py-2.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-5 font-mono font-bold text-blue-600">
                      <Link to={`/cases/${c.id}`} className="hover:underline">
                        {c.case_number}
                      </Link>
                    </td>
                    <td className="py-3 px-5">
                      <p className="font-semibold text-slate-900">{c.title}</p>
                      <span className="text-[10px] text-slate-400 font-medium">{c.complaint_category}</span>
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant="priority" value={c.priority} />
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant="status" value={c.status} />
                    </td>
                    <td className="py-3 px-5 font-mono font-medium text-slate-600">
                      {c.evidence_count ?? 0} items
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Link
                        to={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <span>{isReviewer ? 'Review File' : 'Open File'}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              title="No Cases Recorded"
              description="Create an investigation file or load demonstration cybercrime evidence."
              actionLabel={isInvestigator && !isAdmin ? 'Create Case' : undefined}
              onAction={isInvestigator && !isAdmin ? () => navigate('/cases?new=true') : undefined}
            />
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <SyntheticGalleryModal isOpen={showGalleryModal} onClose={() => setShowGalleryModal(false)} />
      <AdminUsersModal isOpen={showAdminUsersModal} onClose={() => setShowAdminUsersModal(false)} />
      <ModelEvaluationModal isOpen={showModelEvalModal} onClose={() => setShowModelEvalModal(false)} />
    </motion.div>
  );
};
