import React from 'react';

interface BadgeProps {
  label: string;
}

export function StatusBadge({ label }: BadgeProps) {
  const norm = label.toLowerCase();
  
  let bg = 'bg-gray-800 text-gray-300 border-gray-700';
  
  if (['new', 'todo', 'backlog'].includes(norm)) {
    bg = 'bg-gray-800 text-gray-300 border-gray-700';
  } else if (['in progress', 'active', 'planning', 'ui design', 'development'].includes(norm)) {
    bg = 'bg-primary/10 text-primary border-primary/25';
  } else if (['review', 'sent', 'in review', 'proposal sent', 'negotiation'].includes(norm)) {
    bg = 'bg-purple-950/40 text-purple-300 border-purple-500/25';
  } else if (['completed', 'won', 'paid', 'done', 'valid'].includes(norm)) {
    bg = 'bg-success/15 text-success border-success/25';
  } else if (['overdue', 'lost', 'failed', 'blocked', 'critical', 'hot', 'delayed'].includes(norm)) {
    bg = 'bg-danger/15 text-danger border-danger/25';
  } else if (['on hold', 'paused', 'contacted', 'meeting scheduled', 'pending'].includes(norm)) {
    bg = 'bg-warning/15 text-warning border-warning/25';
  } else if (['cancelled', 'inactive', 'churned', 'discontinued'].includes(norm)) {
    bg = 'bg-slate-800 text-slate-400 border-slate-700';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-bold uppercase tracking-wider border ${bg}`}>
      {label}
    </span>
  );
}

export function PriorityBadge({ label }: BadgeProps) {
  const norm = label.toLowerCase();
  
  let bg = 'bg-gray-800 text-gray-300 border-gray-700';
  
  if (norm === 'low') {
    bg = 'bg-gray-800/80 text-gray-400 border-gray-700';
  } else if (norm === 'medium') {
    bg = 'bg-primary/10 text-primary border-primary/25';
  } else if (norm === 'high' || norm === 'hot') {
    bg = 'bg-warning/15 text-warning border-warning/25';
  } else if (norm === 'critical' || norm === 'blocker') {
    bg = 'bg-danger/15 text-danger border-danger/25';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-bold uppercase tracking-wider border ${bg}`}>
      {label}
    </span>
  );
}

