import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { CallerCheckResponse } from '../types';
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
  X
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#17223b]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-cyan-400" />
            <span>Caller Reputation & Telecom Threat Intelligence</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            E.164 NUMBER NORMALISATION, INCIDENT REGISTRY & SUSPICIOUS VOIP DETECTION
          </p>
        </div>

        <button
          onClick={() => {
            setReportNumber(phoneNumber || '+91');
            setShowReportModal(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#11192e] border border-[#1e2e4e] hover:border-cyan-500/50 text-slate-200 text-xs font-medium transition"
        >
          <PlusCircle className="w-4 h-4 text-cyan-400" />
          <span>Flag Suspicious Number</span>
        </button>
      </div>

      {/* Lookup Search Card */}
      <div className="p-6 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl">
        <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-36">
            <label className="block text-[10px] font-mono text-slate-400 mb-1">DEFAULT REGION</label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
            >
              <option value="IN">India (+91)</option>
              <option value="US">USA / Canada (+1)</option>
              <option value="GB">United Kingdom (+44)</option>
              <option value="SG">Singapore (+65)</option>
              <option value="AE">UAE (+971)</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-[10px] font-mono text-slate-400 mb-1">SUSPECT TELEPHONE NUMBER</label>
            <div className="relative">
              <PhoneCall className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                placeholder="+91 98765 43210 or 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          <div className="sm:self-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 shadow-md shadow-cyan-950 transition"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Verify Reputation</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Prominent Privacy & Geographic Disclaimer */}
        <div className="mt-4 p-3 rounded-lg bg-[#070b14] border border-[#17223b] text-xs text-slate-400 font-sans flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">Forensic Privacy Boundary:</strong> TrustGuard AI strictly respects telecom privacy laws. It does <span className="text-amber-300 font-medium">not</span> track live GPS coordinates, home addresses, or real-time cell tower locations. Reputation scores are strictly derived from incident databases, VoIP format checks, and verified cybercrime complaints.
          </p>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Reputation Risk Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl">
              <span className="text-[10px] font-mono text-slate-500 block">E.164 NORMALISED</span>
              <span className="text-lg font-bold font-mono text-cyan-300 mt-1 block">
                {result.normalised_number}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                Format: {result.is_valid_format ? 'Valid ITU Standard' : 'Irregular / Spoofed'}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl">
              <span className="text-[10px] font-mono text-slate-500 block">REPUTATION RISK</span>
              <span className={`text-2xl font-bold font-mono mt-1 block ${
                result.risk_level === 'HIGH' ? 'text-red-400' :
                result.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {result.risk_level} ({result.risk_score}/100)
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                {result.report_count} incident reports on file
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl">
              <span className="text-[10px] font-mono text-slate-500 block">LINE CLASSIFICATION</span>
              <span className="text-base font-semibold text-slate-200 mt-1 block">
                {result.number_type || 'Standard'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                Carrier: {result.carrier || 'Unspecified'}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl">
              <span className="text-[10px] font-mono text-slate-500 block">THREAT REGISTRY SOURCES</span>
              <span className="text-xs font-mono text-slate-300 mt-1 block">
                {result.data_sources.join(', ')}
              </span>
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                Checked: {new Date(result.checked_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* User Submitted Incident Reports */}
          <div className="p-5 rounded-xl bg-[#0c1222] border border-[#17223b] shadow-xl space-y-4">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-cyan-400" />
              <span>Reported Fraud Incident History for {result.normalised_number}</span>
            </h2>

            {result.reports.length === 0 ? (
              <div className="p-6 rounded-lg bg-[#070b14] border border-[#17223b] text-center text-xs text-slate-400">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p>No verified suspicious incident reports registered for this number.</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Absence of reports does not guarantee caller authenticity in spoofed scenarios.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.reports.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-lg bg-[#070b14] border border-[#17223b] text-xs">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] mb-1">
                      <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 font-semibold border border-red-800">
                        {r.report_category}
                      </span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-200 mt-2 font-sans leading-relaxed">{r.description}</p>
                    <div className="mt-2 text-[10px] font-mono text-cyan-400">
                      Status: {r.verification_status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flag Suspicious Number Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0c1222] border border-[#17223b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#17223b]">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-red-400" />
                <span>Flag Suspicious Caller in Threat Registry</span>
              </h2>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs text-center">
                Report logged successfully to incident database.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">PHONE NUMBER *</label>
                  <input
                    type="text"
                    required
                    value={reportNumber}
                    onChange={(e) => setReportNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">FRAUD PATTERN CATEGORY *</label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Impersonation">Police / CBI / Customs Impersonation</option>
                    <option value="Banking Scam">Bank / Credit Card KYC Scam</option>
                    <option value="Robocall">Automated Extortion Robocall</option>
                    <option value="Voice Clone">AI Voice Clone Relative Emergency</option>
                    <option value="Lottery">Lottery / Crypto Investment Scam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">INCIDENT OBSERVATIONS *</label>
                  <textarea
                    rows={3}
                    required
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Details of call, caller demands, spoofed sender name, etc."
                    className="w-full px-3 py-2 bg-[#070b14] border border-[#1e2e4e] rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#17223b]">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-lg bg-[#11192e] text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
                  >
                    {reportSubmitting ? 'Logging...' : 'Submit Threat Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
