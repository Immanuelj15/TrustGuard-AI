import React, { useState } from 'react';
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
  Check
} from 'lucide-react';

interface IOCTableAndCorrelationProps {
  iocs: IOCItem[];
  correlations: IOCCorrelation[];
  loading?: boolean;
  onSelectEvidence?: (evidenceId: string) => void;
}

export const IOCTableAndCorrelation: React.FC<IOCTableAndCorrelationProps> = ({
  iocs,
  correlations,
  loading,
  onSelectEvidence,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCorrelation, setSelectedCorrelation] = useState<IOCCorrelation | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const getIOCTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PHONE':
        return <Phone className="w-3.5 h-3.5 text-cyan-400" />;
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-blue-400" />;
      case 'URL':
        return <LinkIcon className="w-3.5 h-3.5 text-amber-400" />;
      case 'DOMAIN':
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case 'IPV4':
        return <Server className="w-3.5 h-3.5 text-purple-400" />;
      case 'UPI':
        return <CreditCard className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getIOCTypeBadgeClass = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PHONE':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'EMAIL':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'URL':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'DOMAIN':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'IPV4':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'UPI':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedValue(val);
    setTimeout(() => setCopiedValue(null), 1800);
  };

  // Find correlation count for an IOC normalized value
  const getCorrelationForIOC = (normVal: string) => {
    return correlations.find((c) => c.normalized_value === normVal);
  };

  const filteredIOCs = iocs.filter((item) => {
    const matchesType = filterType === 'ALL' || item.ioc_type.toUpperCase() === filterType;
    const matchesSearch =
      !searchQuery ||
      item.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.normalized_value.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const iocTypes = ['ALL', 'PHONE', 'EMAIL', 'DOMAIN', 'URL', 'IPV4', 'UPI'];

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs">Extracting and correlating artifacts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Network className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Extracted Indicators of Compromise (IOCs)
            </h4>
            <p className="text-[11px] text-slate-400">
              Deterministic regex extraction across evidence files and transcripts
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {iocTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                filterType === t
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter IOCs by value or normalized identifier..."
          className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Correlated Entities Highlight Card (if multi-evidence IOCs exist) */}
      {correlations.filter((c) => c.count > 1).length > 0 && (
        <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-amber-400" />
            <h5 className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
              Cross-Evidence Infrastructure Correlations Detected
            </h5>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {correlations
              .filter((c) => c.count > 1)
              .map((corr) => (
                <button
                  key={corr.normalized_value}
                  onClick={() => setSelectedCorrelation(corr)}
                  className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-amber-500/40 text-xs font-mono text-amber-200 hover:bg-amber-500/20 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>{corr.normalized_value}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    Seen in {corr.count} evidence items
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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl border border-cyan-500/40 bg-slate-900/95 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Evidence Correlation Detail: <span className="font-mono text-cyan-300">{selectedCorrelation.normalized_value}</span>
                </span>
              </div>
              <button
                onClick={() => setSelectedCorrelation(null)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Close &times;
              </button>
            </div>
            <p className="text-xs text-slate-400">
              The identifier <strong className="text-slate-200 font-mono">{selectedCorrelation.normalized_value}</strong> was observed across the following evidence objects in this case:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedCorrelation.evidence_filenames.map((name, i) => (
                <div
                  key={i}
                  onClick={() => onSelectEvidence && onSelectEvidence(selectedCorrelation.evidence_ids[i])}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between hover:border-cyan-500/50 cursor-pointer transition-colors"
                >
                  <span className="text-slate-300 font-mono flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    {name}
                  </span>
                  <span className="text-[10px] text-cyan-400 shrink-0 font-mono">View</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IOC Table */}
      {filteredIOCs.length === 0 ? (
        <div className="py-8 text-center text-slate-500 border border-slate-800/60 rounded-lg">
          No IOCs matching filter criteria.
        </div>
      ) : (
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Extracted Value</th>
                  <th className="py-2.5 px-3">Normalized Value</th>
                  <th className="py-2.5 px-3">Correlations</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredIOCs.map((ioc) => {
                  const corr = getCorrelationForIOC(ioc.normalized_value);
                  const isCorrelated = corr && corr.count > 1;

                  return (
                    <tr key={ioc.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold ${getIOCTypeBadgeClass(
                            ioc.ioc_type
                          )}`}
                        >
                          {getIOCTypeIcon(ioc.ioc_type)}
                          {ioc.ioc_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-mono break-all">
                        {ioc.value}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300 font-mono break-all">
                        {ioc.normalized_value}
                      </td>
                      <td className="py-2.5 px-3">
                        {isCorrelated ? (
                          <button
                            onClick={() => setSelectedCorrelation(corr)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-semibold cursor-pointer hover:bg-amber-500/20"
                          >
                            <Network className="w-3 h-3" />
                            Seen in {corr.count} files
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">1 evidence item</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleCopy(ioc.normalized_value)}
                          title="Copy normalized IOC"
                          className="text-slate-400 hover:text-cyan-300 p-1 cursor-pointer transition-colors"
                        >
                          {copiedValue === ioc.normalized_value ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 inline" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 inline" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forensic Disclaimer */}
      <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>Investigator Notice:</strong> Extracted IOCs are based on deterministic regex extraction without external API calls. Shared indicators demonstrate shared infrastructure or contact strings, but do not legally prove identical attribution or threat actor identity.
        </p>
      </div>
    </div>
  );
};
