import React from 'react';
import { cn } from '@/lib/utils';

const statusConfig = {
  backlog: { label: 'Backlog', color: 'bg-slate-100 text-slate-600' },
  todo: { label: 'Da fare', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In corso', color: 'bg-amber-100 text-amber-700' },
  review: { label: 'Revisione', color: 'bg-purple-100 text-purple-700' },
  done: { label: 'Completato', color: 'bg-emerald-100 text-emerald-700' },
};

const priorityConfig = {
  low: { label: 'Bassa', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Media', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.todo;
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.color)}>
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.color)}>
      {config.label}
    </span>
  );
}