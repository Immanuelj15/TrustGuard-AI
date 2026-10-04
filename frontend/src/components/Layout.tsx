import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  FolderLock,
  Cpu,
  PhoneCall,
  FileText,
  ShieldAlert,
  LogOut,
  UserCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, isDemo } = useAuth();
  const navigate = useNavigate();
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

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0c1222] border-r border-[#17223b] flex-shrink-0 z-20">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-[#17223b]">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-wider text-white text-base">TRUSTGUARD</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-tight font-mono">CYBER FORENSICS SUITE</p>
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#11192e]'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Chain of Custody System Status */}
        <div className="p-4 mx-3 mb-3 rounded-lg bg-[#070b14]/70 border border-[#17223b] text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>INTEGRITY SEAL INTACT</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-tight">
            SHA-256 Storage: Secure
          </p>
          <p className="text-[10px] text-slate-400 font-mono leading-tight">
            DB: SQLite/Postgres Ready
          </p>
        </div>

        {/* User Profile Bar */}
        <div className="p-3 border-t border-[#17223b] bg-[#090e1a] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-cyan-400 font-semibold text-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.full_name}</p>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-[#0c1222]/90 border-b border-[#17223b] flex items-center justify-between px-4 md:px-8 z-10 backdrop-blur-md">
          {/* Mobile Menu Toggle & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:block">
              <span className="text-xs text-slate-400 font-mono">WORKSPACE // </span>
              <span className="text-xs text-cyan-400 font-mono font-semibold">DIGITAL EVIDENCE ANALYSIS</span>
            </div>
          </div>

          {/* Quick Case Search */}
          <div className="flex items-center gap-4">
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search Case ID / Keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-3 py-1.5 bg-[#070b14] border border-[#17223b] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono"
              />
            </form>

            {/* Demo Mode Indicator */}
            {isDemo && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/50 text-amber-400 text-xs font-mono">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">DEMO MODE ACTIVE</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">ENGINE ONLINE</span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0c1222] border-b border-[#17223b] p-4 space-y-2 z-30">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded text-slate-300 hover:bg-[#11192e]"
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            <button
              onClick={() => { logout(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-3 py-2 text-red-400 w-full hover:bg-red-950/40 rounded"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#070b14]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
