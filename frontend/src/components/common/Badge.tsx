import React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  value?: string;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate' | 'status' | 'priority' | 'risk';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  value,
  variant = 'blue',
  size = 'sm',
  className = '',
}) => {
  const text = children || value || '';
  const normalizedVal = (value || (typeof children === 'string' ? children : '')).toLowerCase();

  let resolvedColor: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate' = 'blue';

  if (variant === 'status') {
    if (normalizedVal === 'open') resolvedColor = 'amber';
    else if (normalizedVal === 'under_investigation') resolvedColor = 'blue';
    else if (normalizedVal === 'awaiting_review') resolvedColor = 'purple';
    else if (normalizedVal === 'resolved' || normalizedVal === 'analyzed') resolvedColor = 'green';
    else if (normalizedVal === 'closed') resolvedColor = 'slate';
    else resolvedColor = 'slate';
  } else if (variant === 'priority') {
    if (normalizedVal === 'critical') resolvedColor = 'red';
    else if (normalizedVal === 'high') resolvedColor = 'amber';
    else if (normalizedVal === 'medium') resolvedColor = 'blue';
    else resolvedColor = 'green';
  } else if (variant === 'risk') {
    if (normalizedVal === 'critical' || normalizedVal === 'high') resolvedColor = 'red';
    else if (normalizedVal === 'medium' || normalizedVal === 'moderate') resolvedColor = 'amber';
    else if (normalizedVal === 'low' || normalizedVal === 'safe') resolvedColor = 'green';
    else resolvedColor = 'blue';
  } else {
    resolvedColor = variant;
  }

  const variantStyles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 font-semibold',
    md: 'text-xs px-3 py-1 font-bold',
  };

  const displayText = typeof text === 'string' ? text.replace('_', ' ').toUpperCase() : text;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border tracking-tight ${variantStyles[resolvedColor]} ${sizeStyles[size]} ${className}`}
    >
      {displayText}
    </span>
  );
};
