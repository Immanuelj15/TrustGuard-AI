import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Shield, Lock, Mail, AlertCircle, Fingerprint, KeyRound, Check } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email: email.trim(),
        password: password,
      });

      const { access_token, user } = response.data;
      login(access_token, user);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Authentication failed. Please verify credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background forensic grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#17223b_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>

      <div className="w-full max-w-md z-10">
        {/* Logo and Platform Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 mb-4 shadow-xl shadow-cyan-950/50">
            <Fingerprint className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            TRUSTGUARD <span className="text-cyan-400 font-mono text-sm bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 rounded">AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono tracking-wide uppercase">
            Cybercrime Investigation & Evidence Analysis Platform
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#0c1222]/90 border border-[#17223b] rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/80">
          <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Authorized Officer Sign-In</span>
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">OFFICER IDENTIFIER (EMAIL)</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@trustguard.ai"
                  className="w-full pl-9 pr-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">SECURITY PASSPHRASE</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg text-sm transition shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Authenticate & Enter Workspace</span>
                </>
              )}
            </button>
          </form>

          {/* Seeded Demonstration Accounts Quick-Fill */}
          <div className="mt-6 pt-5 border-t border-[#17223b]">
            <p className="text-[11px] font-mono text-slate-400 mb-2 uppercase tracking-wider text-center">
              Quick-Fill Demonstration Profiles
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('investigator@trustguard.ai', 'Investigator@2026')}
                className="p-2 rounded bg-[#11192e] border border-[#1e2e4e] hover:border-cyan-500/50 text-left transition"
              >
                <div className="font-semibold text-cyan-300">Investigator</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">Insp. Rajesh</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@trustguard.ai', 'Admin@TrustGuard2026')}
                className="p-2 rounded bg-[#11192e] border border-[#1e2e4e] hover:border-cyan-500/50 text-left transition"
              >
                <div className="font-semibold text-blue-300">Admin</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">System Admin</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('reviewer@trustguard.ai', 'Reviewer@2026')}
                className="p-2 rounded bg-[#11192e] border border-[#1e2e4e] hover:border-cyan-500/50 text-left transition"
              >
                <div className="font-semibold text-purple-300">Reviewer</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">Forensic Reviewer</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('demo@trustguard.ai', 'Demo@2026')}
                className="p-2 rounded bg-[#11192e] border border-[#1e2e4e] hover:border-cyan-500/50 text-left transition"
              >
                <div className="font-semibold text-emerald-300">Guest Demo</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">Auditor View</div>
              </button>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <p className="mt-6 text-center text-[10px] text-slate-500 leading-normal max-w-sm mx-auto">
          LAW ENFORCEMENT & INVESTIGATIVE ASSISTANCE SYSTEM.<br />
          All actions, evidence access, and cryptographic verifications are tracked under immutable audit logs.
        </p>
      </div>
    </div>
  );
};
