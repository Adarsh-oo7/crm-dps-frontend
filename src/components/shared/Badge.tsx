import React from 'react';

interface BadgeProps {
  label: string;
}

export function StatusBadge({ label }: BadgeProps) {
  const norm = label.toLowerCase();
  
  let bg = 'bg-gray-100 text-gray-800 border-gray-200';
  
  if (['new', 'todo', 'backlog'].includes(norm)) {
    bg = 'bg-gray-100 text-gray-700 border-gray-200';
  } else if (['in progress', 'active', 'planning', 'ui design', 'development'].includes(norm)) {
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (['review', 'sent', 'in review', 'proposal sent', 'negotiation'].includes(norm)) {
    bg = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (['completed', 'won', 'paid', 'done', 'valid'].includes(norm)) {
    bg = 'bg-green-50 text-green-700 border-green-200';
  } else if (['overdue', 'lost', 'failed', 'blocked', 'critical', 'hot', 'delayed'].includes(norm)) {
    bg = 'bg-red-50 text-red-700 border-red-200';
  } else if (['on hold', 'paused', 'contacted', 'meeting scheduled', 'pending'].includes(norm)) {
    bg = 'bg-yellow-50 text-yellow-700 border-yellow-200';
  } else if (['cancelled', 'inactive', 'churned', 'discontinued'].includes(norm)) {
    bg = 'bg-slate-100 text-slate-600 border-slate-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
      {label}
    </span>
  );
}

export function PriorityBadge({ label }: BadgeProps) {
  const norm = label.toLowerCase();
  
  let bg = 'bg-gray-100 text-gray-800 border-gray-200';
  
  if (norm === 'low') {
    bg = 'bg-gray-50 text-gray-600 border-gray-200';
  } else if (norm === 'medium') {
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (norm === 'high' || norm === 'hot') {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (norm === 'critical' || norm === 'blocker') {
    bg = 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
      {label}
    </span>
  );
}
