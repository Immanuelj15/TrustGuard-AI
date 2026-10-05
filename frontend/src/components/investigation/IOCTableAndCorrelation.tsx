import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IOCItem, IOCCorrelation } from '../../types';
import { 
  Phone, 
  Mail, 
  Globe, 
  Link as LinkIcon, 
  Server, 
  CreditCard, 
  Search, 
  Network, 
  Info, 
  FileText,
  Copy,
  Check,
  X,
  ShieldAlert,
  ArrowRight,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface IOCTableAndCorrelationProps {
  iocs?: IOCItem[];
  correlations?: IOCCorrelation[] | any;
  loading?: boolean;
  onSelectEvidence?: (evidenceId: string) => void;
}

export const IOCTableAndCorrelation: React.FC<IOCTableAndCorrelationProps> = ({
  iocs = [],
  correlations = [],
  loading,
  onSelectEvidence,
}) => {
  const safeIocs = useMemo<IOCItem[]>(() => (Array.isArray(iocs) ? iocs : []), [iocs]);

  const safeCorrelations = useMemo<IOCCorrelation[]>(() => {
    if (Array.isArray(correlations)) {
      return correlations;
    }
    if (correlations && typeof correlations === 'object') {
      const list = (correlations as any).shared_iocs || (correlations as any).correlations;
      if (Array.isArray(list)) {
        return list.map((s: any) => ({
          ioc_type: s.ioc_type || 'IOC',
          normalized_value: s.normalized_value || s.value || '',
          count: s.evidence_count || (s.evidence_items ? s.evidence_items.length : (s.evidence_ids ? s.evidence_ids.length : 1)),
          evidence_ids: s.evidence_ids || (s.evidence_items || []).map((e: any) => e.id),
          evidence_filenames: s.evidence_filenames || (s.evidence_items || []).map((e: any) => e.filename) || [],
        }));
      }
    }
    return [];
  }, [correlations]);

  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCorrelation, setSelectedCorrelation] = useState<IOCCorrelation | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // Counts for each type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: safeIocs.length,
      PHONE: 0,
      EMAIL: 0,
      DOMAIN: 0,
      URL: 0,
      IPV4: 0,
      UPI: 0,
    };
    safeIocs.forEach((ioc) => {
      const t = (ioc.ioc_type || '').toUpperCase();
      if (counts[t] !== undefined) {
        counts[t]++;
      } else {
        counts[t] = (counts[t] || 0) + 1;
      }
    });
    return counts;
  }, [safeIocs]);

  const multiEvidenceCorrelations = useMemo(() => {
    return safeCorrelations.filter((c) => c && c.count > 1);
  }, [safeCorrelations]);

  const getIOCTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PHONE':
        return <Phone className="w-3.5 h-3.5 text-sky-600" />;
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-indigo-600" />;
      case 'URL':
        return <LinkIcon className="w-3.5 h-3.5 text-amber-600" />;
      case 'DOMAIN':
        return <Globe className="w-3.5 h-3.5 text-emerald-600" />;
      case 'IPV4':
        return <Server className="w-3.5 h-3.5 text-purple-600" />;
      case 'UPI':
        return <CreditCard className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getIOCTypeBadgeClass = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PHONE':
        return 'bg-sky-50 text-sky-700 border-sky-200/80';
      case 'EMAIL':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
      case 'URL':
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      case 'DOMAIN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'IPV4':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'UPI':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedValue(val);
    setTimeout(() => setCopiedValue(null), 1800);
  };

  const getCorrelationForIOC = (normVal: string) => {
    return safeCorrelations.find((c) => c.normalized_value === normVal);
  };

  const filteredIOCs = useMemo(() => {
    return safeIocs.filter((item) => {
      if (!item) return false;
      const matchesType = filterType === 'ALL' || item.ioc_type?.toUpperCase() === filterType;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.value?.toLowerCase().includes(q) ||
        item.normalized_value?.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [safeIocs, filterType, searchQuery]);

  const iocTypes = ['ALL', 'PHONE', 'EMAIL', 'DOMAIN', 'URL', 'IPV4', 'UPI'];

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-700">Extracting and correlating case indicators...</p>
        <p className="text-xs text-slate-400 mt-1">Cross-referencing entities against case evidence transcripts and metadata</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total IOCs</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{safeIocs.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Extracted artifacts</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Correlated Entities</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{multiEvidenceCorrelations.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Shared across files</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Network className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Communication</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{(typeCounts['PHONE'] || 0) + (typeCounts['EMAIL'] || 0)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Phones & Emails</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Phone className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Network & Payment</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {(typeCounts['UPI'] || 0) + (typeCounts['DOMAIN'] || 0) + (typeCounts['URL'] || 0) + (typeCounts['IPV4'] || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">UPI, Web, IPs</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Cross-Evidence Correlation Banner (if repeated IOCs exist) */}
      {multiEvidenceCorrelations.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-white shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                <Network className="w-4 h-4" />
              </span>
              <div>
                <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Cross-Evidence Infrastructure Correlations Detected
                </h5>
                <p className="text-[11px] text-amber-700">
                  The following identifiers appear in multiple separate evidence objects, indicating unified suspect infrastructure:
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
              {multiEvidenceCorrelations.length} Linked
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {multiEvidenceCorrelations.map((corr) => (
              <button
                key={corr.normalized_value}
                onClick={() => setSelectedCorrelation(corr)}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-200/80 hover:border-amber-400 text-xs font-mono text-slate-800 hover:bg-amber-50/50 transition-all flex items-center gap-2 shadow-xs cursor-pointer group"
              >
                <span className="font-semibold text-slate-900 group-hover:text-amber-800">{corr.normalized_value}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {corr.count} evidence files
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Correlation Modal / Flyout */}
      <AnimatePresence>
        {selectedCorrelation && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-5 rounded-2xl border border-blue-200 bg-white shadow-lg space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Network className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Correlation Detail</span>
                  <div className="font-mono text-sm font-bold text-slate-900">{selectedCorrelation.normalized_value}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCorrelation(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              This entity was observed across <strong>{selectedCorrelation.count} separate evidence items</strong> in this case:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {(selectedCorrelation.evidence_filenames || []).map((name, i) => (
                <div
                  key={i}
                  onClick={() => onSelectEvidence && selectedCorrelation.evidence_ids?.[i] && onSelectEvidence(selectedCorrelation.evidence_ids[i])}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/30 text-xs flex items-center justify-between cursor-pointer transition-all group"
                >
                  <span className="text-slate-800 font-medium font-mono flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    {name}
                  </span>
                  <span className="text-[11px] font-semibold text-blue-600 shrink-0 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Inspect <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Toolbar: Filter Pills & Search Bar */}
        <div className="p-4 border-b border-slate-200/70 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Pills with Counts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {iocTypes.map((t) => {
              const count = typeCounts[t] ?? 0;
              const isActive = filterType === t;
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/30'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <span>{t}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                      isActive ? 'bg-blue-700/60 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px] md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IOCs by text or pattern..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* IOC Table or Empty State */}
        {safeIocs.length === 0 ? (
          <div className="py-16 px-6 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-4 shadow-xs">
              <Database className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900">No Indicators Extracted Yet</h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              This case does not have any extracted phone numbers, UPI identifiers, URLs, domains, or IP addresses yet. Evidence files uploaded to this case must be analyzed in the Workspace to populate indicators.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link
                to="/analysis"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <span>Go to Analysis Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : filteredIOCs.length === 0 ? (
          <div className="py-14 px-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No Matching Indicators</h4>
            <p className="text-xs text-slate-500 mt-1">
              No IOCs matching type <strong className="text-slate-700">{filterType}</strong>
              {searchQuery && <span> and search query "{searchQuery}"</span>}.
            </p>
            <button
              onClick={() => {
                setFilterType('ALL');
                setSearchQuery('');
              }}
              className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl cursor-pointer transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Indicator Type</th>
                  <th className="py-3 px-4">Extracted Literal</th>
                  <th className="py-3 px-4">Normalized Value</th>
                  <th className="py-3 px-4">Case Linkage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIOCs.map((ioc) => {
                  const corr = getCorrelationForIOC(ioc.normalized_value);
                  const isCorrelated = corr && corr.count > 1;

                  return (
                    <tr key={ioc.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${getIOCTypeBadgeClass(
                            ioc.ioc_type
                          )}`}
                        >
                          {getIOCTypeIcon(ioc.ioc_type)}
                          <span>{ioc.ioc_type}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono break-all max-w-xs">
                        {ioc.value}
                      </td>
                      <td className="py-3 px-4 text-blue-700 font-mono font-semibold break-all max-w-xs">
                        {ioc.normalized_value}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isCorrelated ? (
                          <button
                            onClick={() => setSelectedCorrelation(corr)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold cursor-pointer hover:bg-amber-100 transition-colors"
                          >
                            <Network className="w-3.5 h-3.5 text-amber-600" />
                            <span>Seen in {corr.count} files</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">1 evidence file</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleCopy(ioc.normalized_value)}
                          title="Copy normalized indicator"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 cursor-pointer transition-all"
                        >
                          {copiedValue === ioc.normalized_value ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[10px] text-emerald-600 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Copy</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forensic Disclaimer Footer */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5 text-xs text-slate-500">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-700">Forensic Integrity Notice:</strong> Extracted indicators are generated via deterministic regex analysis and local parser extraction. Identical normalized strings establish technical correlation across files, but human investigator review is required prior to statutory attribution.
        </p>
      </div>
    </div>
  );
};
