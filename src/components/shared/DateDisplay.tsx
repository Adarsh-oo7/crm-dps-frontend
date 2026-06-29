import React from 'react';

interface DateDisplayProps {
  dateString?: string | null;
  includeTime?: boolean;
}

export default function DateDisplay({ dateString, includeTime = false }: DateDisplayProps) {
  if (!dateString) return <span className="text-gray-400">—</span>;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return <span className="text-gray-400">—</span>;

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    const formatted = new Intl.DateTimeFormat('en-US', options).format(date);
    return <span className="text-gray-700 text-sm">{formatted}</span>;
  } catch (e) {
    return <span className="text-gray-400">—</span>;
  }
}
