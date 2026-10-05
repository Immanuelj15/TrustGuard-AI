import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  LayoutDashboard,
  FolderLock,
  Cpu,
  PhoneCall,
  FileText,
  ShieldAlert,
  LogOut,
  Search,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Users,
  Sliders,
  Eye,
  Network,
  Binary,
  Layers
} from 'lucide-react';
import { ModelEvaluationModal } from './investigation/ModelEvaluationModal';
import { AdminUsersModal } from './common/AdminUsersModal';

interface NavItem {
  to?: string;
  label: string;
  icon: any;
  onClick?: () => void;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Layout: React.FC = () => {
  const { user, logout, isDemo, isAdmin, isInvestigator, isReviewer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modelEvalOpen, setModelEvalOpen] = useState(false);
  const [adminUsersOpen, setAdminUsersOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/cases?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // Build role-specific navigation sections
  const getNavSections = (): NavSection[] => {
    const role = user?.role || 'investigator';

    if (role === 'admin') {
      return [
        {
          title: 'OVERVIEW',
          items: [
            { to: '/', label: 'Forensic Dashboard', icon: LayoutDashboard }
          ]
        },
        {
          title: 'INVESTIGATION',
          items: [
            { to: '/cases', label: 'Case Management', icon: FolderLock },
            { to: '/analysis', label: 'Analysis Workspace', icon: Cpu },
            { to: '/caller-check', label: 'Caller Intelligence', icon: PhoneCall }
          ]
        },
        {
          title: 'MONITORING',
          items: [
            { to: '/reports', label: 'Investigation Reports', icon: FileText },
            { to: '/audit-logs', label: 'Audit Trail', icon: ShieldAlert }
          ]
        },
        {
          title: 'ADMINISTRATION',
          items: [
            {
              label: 'User Management',
              icon: Users,
              onClick: () => setAdminUsersOpen(true),
              badge: 'RBAC',
              badgeColor: 'bg-purple-100 text-purple-700'
            },
            {
              label: 'System & Model Telemetry',
              icon: Sliders,
              onClick: () => setModelEvalOpen(true),
              badge: 'Active',
              badgeColor: 'bg-emerald-100 text-emerald-700'
            }
          ]
        }
      ];
    }

    if (role === 'reviewer') {
      return [
        {
          title: 'REVIEW',
          items: [
            { to: '/', label: 'Review Dashboard', icon: LayoutDashboard },
            { to: '/cases?status=awaiting_review', label: 'Assigned Cases', icon: FolderLock },
            { to: '/analysis', label: 'Evidence Review', icon: Eye }
          ]
        },
        {
          title: 'ANALYSIS',
          items: [
            { to: '/analysis', label: 'Analysis Results', icon: Binary },
            { to: '/cases?tab=correlations', label: 'Evidence Correlation', icon: Network }
          ]
        },
        {
          title: 'REPORTING',
          items: [
            { to: '/reports', label: 'Investigation Reports', icon: FileText },
            { to: '/audit-logs', label: 'Audit Trail', icon: ShieldAlert }
          ]
        }
      ];
    }

    if (role === 'demo_user') {
      return [
        {
          title: 'DEMO ENVIRONMENT',
          items: [
            { to: '/', label: 'Demo Dashboard', icon: LayoutDashboard },
            { to: '/cases', label: 'Demo Cases', icon: FolderLock },
            { to: '/analysis', label: 'Demo Analysis', icon: Cpu },
            { to: '/caller-check', label: 'Demo Caller Check', icon: PhoneCall },
            { to: '/reports', label: 'Demo Reports', icon: FileText }
          ]
        }
      ];
    }

    // Default: Investigator Experience
    return [
      {
        title: 'INVESTIGATION',
        items: [
          { to: '/', label: 'Investigation Dashboard', icon: LayoutDashboard },
          { to: '/cases', label: 'My Cases', icon: FolderLock },
          { to: '/analysis', label: 'Analysis Workspace', icon: Cpu }
        ]
      },
      {
        title: 'INTELLIGENCE',
        items: [
          { to: '/cases?tab=iocs', label: 'IOC Explorer', icon: Binary },
          { to: '/cases?tab=correlations', label: 'Evidence Correlation', icon: Network },
          { to: '/caller-check', label: 'Caller Threat Intel', icon: PhoneCall }
        ]
      },
      {
        title: 'REPORTING',
        items: [
          { to: '/reports', label: 'Investigation Reports', icon: FileText },
          { to: '/audit-logs', label: 'Audit Trail', icon: ShieldAlert }
        ]
      }
    ];
  };

  const navSections = getNavSections();

  const isLinkActive = (to?: string) => {
    if (!to) return false;
    const currentPath = location.pathname;
    const currentSearch = location.search;

    if (to.includes('?')) {
      const [targetPath, targetQuery] = to.split('?');
      if (currentPath !== targetPath) return false;
      const targetParams = new URLSearchParams(targetQuery);
      const currentParams = new URLSearchParams(currentSearch);
      for (const [key, val] of targetParams.entries()) {
        if (currentParams.get(key) !== val) return false;
      }
      return true;
    }

    if (to === '/cases') {
      const currentParams = new URLSearchParams(currentSearch);
      if (currentParams.get('tab') || currentParams.get('view')) return false;
      return currentPath === '/cases';
    }

    if (to === '/') {
      return currentPath === '/' && !currentSearch;
    }

    return currentPath === to || currentPath.startsWith(to + '/');
  };

  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path === '/') {
      if (isAdmin) return 'System Forensics Oversight & Administration';
      if (isReviewer) return 'Evidence Review Queue';
      if (isDemo) return 'Synthetic Demo Dashboard';
      return 'Forensic Investigation Dashboard';
    }
    if (path.startsWith('/cases/') && path.length > 7) return 'Case Investigation File';
    if (path.startsWith('/cases')) {
      const search = new URLSearchParams(location.search);
      if (search.get('tab') === 'iocs') return 'Indicators of Compromise (IOC) Explorer';
      if (search.get('tab') === 'correlations' || search.get('view') === 'correlations') return 'Evidence Correlation & Threat Graph';
      return 'Case Directory';
    }
    if (path.startsWith('/analysis')) return 'Evidence Analysis Workspace';
    if (path.startsWith('/caller-check')) return 'Caller Threat Intelligence';
    if (path.startsWith('/reports')) return 'Certified Investigation Reports';
    if (path.startsWith('/audit-logs')) return 'Immutable Security Audit Trail';
    return 'Digital Forensics';
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'investigator':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'reviewer':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'demo_user':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0 z-20 shadow-xs">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-slate-900 text-base">TRUSTGUARD</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">
              Digital Forensics
            </p>
          </div>
        </div>

        {/* Demo Mode Sub-banner */}
        {isDemo && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200/80 flex items-center gap-2 text-[11px] text-amber-800 font-semibold font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>DEMO MODE ACTIVE</span>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                if (item.onClick) {
                  return (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150 text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                }

                const active = isLinkActive(item.to);

                return (
                  <NavLink
                    key={item.label}
                    to={item.to || '/'}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 relative group ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      <span>{item.label}</span>
                    </div>
                    {active && (
                      <motion.div
                        layoutId="activePill"
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-l"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Evidence Integrity Status Card */}
        <div className="p-3 mx-3 mb-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 font-mono font-semibold text-[11px] mb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>✓ EVIDENCE INTEGRITY VERIFIED</span>
          </div>
          <p className="text-[11px] text-slate-500 font-sans leading-tight">
            SHA-256 verification active on ingested evidence.
          </p>
        </div>

        {/* User Profile Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-700 font-bold text-xs">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border font-bold uppercase ${getRoleBadgeStyle(user?.role || '')}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shadow-xs">
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">TrustGuard AI</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-blue-600 font-semibold">{getBreadcrumbTitle()}</span>
            </div>
          </div>

          {/* Quick Search & Status Indicators */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Case ID / Keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 lg:w-64 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans transition"
              />
            </form>

            {/* Model Evaluation Modal Button */}
            <button
              onClick={() => setModelEvalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-medium transition shadow-2xs"
              title="Inspect BERT, Whisper & Risk Engine Telemetry"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <span>MODELS</span>
            </button>

            {/* Synthetic Benchmark Indicator */}
            <div 
              onClick={() => navigate('/analysis')}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-medium cursor-pointer hover:bg-blue-100 transition shadow-2xs"
              title="530 Safe Synthetic Demonstration Assets Loaded for Academic Testing"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>530 SYNTHETIC ASSETS</span>
            </div>

            {/* Demo Mode Badge */}
            {isDemo && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-mono font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">DEMO</span>
              </div>
            )}

            {/* Online Indicator */}
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">SYSTEM ONLINE</span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-b border-slate-200 p-4 space-y-3 z-30 shadow-md max-h-[80vh] overflow-y-auto"
            >
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    if (item.onClick) {
                      return (
                        <button
                          key={item.label}
                          onClick={() => {
                            item.onClick?.();
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 w-full text-left"
                        >
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span>{item.label}</span>
                        </button>
                      );
                    }
                    const active = isLinkActive(item.to);
                    return (
                      <NavLink
                        key={item.label}
                        to={item.to || '/'}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                          active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-red-600 w-full hover:bg-red-50 rounded-lg text-xs font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>

      {/* Admin Users Modal */}
      <AdminUsersModal isOpen={adminUsersOpen} onClose={() => setAdminUsersOpen(false)} />

      {/* Model Evaluation Telemetry Modal */}
      <ModelEvaluationModal isOpen={modelEvalOpen} onClose={() => setModelEvalOpen(false)} />
    </div>
  );
};
