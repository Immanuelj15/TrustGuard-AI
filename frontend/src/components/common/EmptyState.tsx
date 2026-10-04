import React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';
import { motion } from 'framer-motion';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  message?: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderSearch,
  title,
  description,
  message,
  actionText,
  actionLabel,
  onAction,
}) => {
  const desc = description || message || '';
  const btnLabel = actionLabel || actionText;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="p-8 text-center flex flex-col items-center justify-center bg-transparent"
    >
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
      {desc && <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">{desc}</p>}
      {btnLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          {btnLabel}
        </button>
      )}
    </motion.div>
  );
};
