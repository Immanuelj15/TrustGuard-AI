import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { CallerCheckResponse } from '../types';
import { Badge } from '../components/common/Badge';
import {
  PhoneCall,
  Search,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Building,
  Radio,
  FileWarning,
  PlusCircle,
  Info,
  X,
  ShieldCheck,
  Check
} from 'lucide-react';

export const CallerReputationPage: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CallerCheckResponse | null>(null);

  // Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportNumber, setReportNumber] = useState('');
  const [reportCategory, setReportCategory] = useState('Impersonation');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setLoading(true);

    try {
      const res = await apiClient.post<CallerCheckResponse>('/caller/check', {
        phone_number: phoneNumber.trim(),
        country_code: countryCode,
      });
      setResult(res.data);
    } catch (err) {
      console.error('Lookup failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitting(true);
    try {
      await apiClient.post('/caller/report', {
        phone_number: reportNumber.trim(),
        report_category: reportCategory,
        description: reportDesc.trim(),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportModal(false);
        setReportDesc('');
      }, 2000);
    } catch (err) {
      console.error('Report submission failed', err);
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <PhoneCall className="w-6 h-6 text-blue-600" />
            <span>Caller Reputation & Telecom Threat Intelligence</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ITU E.164 number normalisation, scam complaints history, and suspicious VOIP detection.
          </p>
        </div>

        <button
          onClick={() => {
            setReportNumber(phoneNumber || '+91');
            setShowReportModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-blue-600" />
          <span>Flag Suspicious Number</span>
        </button>
      </div>

      {/* DEMO / INFORMATIONAL Notice Banner (Section 19) */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-start gap-3 shadow-2xs">
        <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[11px] uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
              DEMO / INFORMATIONAL
            </span>
            <span className="font-semibold text-slate-700">Telecom Threat Intelligence Advisory</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Data provided is derived solely from ITU E.164 parsing, national numbering plans, and user-submitted incident registries. 
            TrustGuard AI does <strong>not</strong> provide GPS tracking, real-time subscriber identity, criminal records, or guaranteed scam classification.
          </p>
        </div>
      </div>

      {/* Lookup Search Card */}
      <div className="surface-card p-6 space-y-4">
        <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-44">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
              Default Region
            </label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            >
              <option value="IN">India (+91)</option>
              <option value="US">USA / Canada (+1)</option>
              <option value="GB">United Kingdom (+44)</option>
              <option value="SG">Singapore (+65)</option>
              <option value="AE">UAE (+971)</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
              Suspect Telephone Number
            </label>
            <div className="relative">
              <PhoneCall className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="+91 98765 43210 or 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>
          </div>

          <div className="sm:self-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Verify Reputation</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Privacy & Geographic Disclaimer */}
        <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-900 font-semibold">Forensic Privacy Boundary:</strong> TrustGuard AI strictly conforms to telecom privacy standards. It does <span className="text-blue-700 font-semibold">not</span> track live GPS coordinates, personal home addresses, or cellular tower triangulations. Reputation data is strictly aggregated from complaints registries, VoIP spoofing patterns, and cybercrime incident logs.
          </p>
        </div>
      </div>

      {/* Results Section */}
      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Reputation Risk Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="surface-card p-5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">E.164 Normalised</span>
                <span className="text-lg font-bold font-mono text-blue-600 mt-1 block">
                  {result.normalised_number}
                </span>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  Format: {result.is_valid_format ? 'Valid ITU Standard' : 'Irregular / Spoofed'}
                </span>
              </div>

              <div className="surface-card p-5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Reputation Risk</span>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="risk" value={result.risk_level} />
                  <span className="text-sm font-bold text-slate-700">({result.risk_score}/100)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium mt-1.5 block">
                  {result.report_count} incident reports on record
                </span>
              </div>

              <div className="surface-card p-5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Line Classification</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  {result.number_type || 'Standard Mobile'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  Carrier: {result.carrier || 'Unspecified'}
                </span>
              </div>

              <div className="surface-card p-5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Threat Registry Sources</span>
                <span className="text-xs font-semibold text-slate-800 mt-1 block truncate">
                  {result.data_sources.join(', ')}
                </span>
                <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                  Checked: {new Date(result.checked_at).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* User Submitted Incident Reports */}
            <div className="surface-card p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-blue-600" />
                <span>Reported Fraud Incident History for {result.normalised_number}</span>
              </h2>

              {result.reports.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800">No verified suspicious reports registered for this number.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Absence of complaints does not preclude spoofed call operations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.reports.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
                          {r.report_category}
                        </span>
                        <span className="font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-800 mt-2 font-medium leading-relaxed">{r.description}</p>
                      <div className="mt-2 text-[10px] font-semibold text-blue-700 uppercase">
                        Verification Status: {r.verification_status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flag Suspicious Number Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileWarning className="w-5 h-5 text-rose-600" />
                  <span>Flag Suspicious Caller in Threat Registry</span>
                </h2>
                <button 
                  onClick={() => setShowReportModal(false)} 
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reportSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-semibold flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Threat incident logged successfully to threat registry.</span>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      PHONE NUMBER *
                    </label>
                    <input
                      type="text"
                      required
                      value={reportNumber}
                      onChange={(e) => setReportNumber(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      FRAUD PATTERN CATEGORY *
                    </label>
                    <select
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    >
                      <option value="Impersonation">Police / CBI / Customs Impersonation</option>
                      <option value="Banking Scam">Bank / Credit Card KYC Scam</option>
                      <option value="Robocall">Automated Extortion Robocall</option>
                      <option value="Voice Clone">AI Voice Clone Relative Emergency</option>
                      <option value="Lottery">Lottery / Crypto Investment Scam</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      INCIDENT OBSERVATIONS *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      placeholder="Details of call, caller demands, spoofed sender name, etc."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reportSubmitting}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      {reportSubmitting ? 'Logging...' : 'Submit Threat Report'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
