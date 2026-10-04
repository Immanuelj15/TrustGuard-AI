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
  UserCheck,
  Sparkles
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, isDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/cases?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const navItems = [
    { to: '/', label: 'Forensic Dashboard', icon: LayoutDashboard },
    { to: '/cases', label: 'Case Management', icon: FolderLock },
    { to: '/analysis', label: 'Analysis Workspace', icon: Cpu },
    { to: '/caller-check', label: 'Caller Reputation', icon: PhoneCall },
    { to: '/reports', label: 'Investigation Reports', icon: FileText },
    { to: '/audit-logs', label: 'Audit Trail', icon: ShieldAlert },
  ];

  // Helper for dynamic breadcrumbs
  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard Overview';
    if (path.startsWith('/cases/') && path.length > 7) return 'Case Investigation File';
    if (path.startsWith('/cases')) return 'Case Directory';
    if (path.startsWith('/analysis')) return 'Evidence Analysis Workspace';
    if (path.startsWith('/caller-check')) return 'Caller Threat Intelligence';
    if (path.startsWith('/reports')) return 'Certified Investigation Reports';
    if (path.startsWith('/audit-logs')) return 'Immutable Security Audit Trail';
    return 'Digital Forensics';
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

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activePill"
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-l"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Evidence Integrity Status Card */}
        <div className="p-3.5 mx-3 mb-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 font-mono font-semibold text-[11px] mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>CHAIN OF CUSTODY INTACT</span>
          </div>
          <p className="text-[11px] text-slate-500 font-sans leading-tight">
            SHA-256 evidence hashing active on ingestion.
          </p>
        </div>

        {/* User Profile Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-700 font-bold text-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name}</p>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 uppercase">
                {user?.role}
              </span>
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
          <div className="flex items-center gap-4">
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Case ID / Keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans transition"
              />
            </form>

            {/* Synthetic Benchmark Indicator */}
            <div 
              onClick={() => navigate('/analysis')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-medium cursor-pointer hover:bg-blue-100 transition shadow-xs"
              title="530 Safe Synthetic Demonstration Assets Loaded for Academic Testing"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>SYNTHETIC BENCHMARK: 530 ASSETS</span>
            </div>

            {/* Demo Mode Badge */}
            {isDemo && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-mono font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">DEMO MODE ACTIVE</span>
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
              className="md:hidden bg-white border-b border-slate-200 p-4 space-y-1 z-30 shadow-md"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                        isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-blue-600" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 text-red-600 w-full hover:bg-red-50 rounded-lg text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
