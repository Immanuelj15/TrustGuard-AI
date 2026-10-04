import React from 'react';
import { motion } from 'framer-motion';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading investigative records...',
  size = 'md',
}) => {
  const spinnerSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <div className={`relative ${spinnerSize}`}>
        <div className={`absolute inset-0 rounded-full border-2 border-blue-100`}></div>
        <div className={`absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin`}></div>
      </div>
      {message && (
        <p className="mt-3 text-xs font-medium text-slate-500 font-mono tracking-wide">
          {message}
        </p>
      )}
    </motion.div>
  );
};
