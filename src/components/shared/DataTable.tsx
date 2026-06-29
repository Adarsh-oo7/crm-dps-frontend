import React from 'react';
import { Loader2, Inbox } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({ 
  columns, 
  data, 
  isLoading = false, 
  emptyMessage = 'No records found.', 
  onRowClick 
}: DataTableProps<T>) {
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-bg-card rounded-2xl border border-border-card">
        <Loader2 className="w-6 h-6 text-primary animate-spin mr-3" />
        <span className="text-xs font-semibold text-text-sub">Loading records...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-bg-card rounded-2xl border border-border-card text-center">
        <Inbox className="w-10 h-10 text-text-sub mb-3 opacity-60" />
        <p className="text-xs font-bold text-white uppercase tracking-wider">{emptyMessage}</p>
        <p className="text-3xs text-text-sub mt-1">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-bg-card rounded-2xl border border-border-card shadow-lg">
      <table className="min-w-full divide-y divide-border-card/40">
        <thead className="bg-bg-main/40">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={idx}
                scope="col"
                className={`px-6 py-3.5 text-left text-3xs font-bold text-text-sub uppercase tracking-wider ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-card/40">
          {data.map((row, rowIdx) => (
            <tr 
              key={rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`transition-colors duration-150 ${onRowClick ? 'cursor-pointer hover:bg-bg-main/30' : ''}`}
            >
              {columns.map((column, colIdx) => (
                <td 
                  key={colIdx} 
                  className={`px-6 py-4 whitespace-nowrap text-xs text-white ${column.className || ''}`}
                >
                  {column.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

