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
      <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
        <Loader2 className="w-8 h-8 text-primary animate-spin mr-3" />
        <span className="text-sm font-semibold text-gray-500">Loading records...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 text-center">
        <Inbox className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-base font-semibold text-gray-900">{emptyMessage}</p>
        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={idx}
                scope="col"
                className={`px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.map((row, rowIdx) => (
            <tr 
              key={rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`transition-colors duration-150 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            >
              {columns.map((column, colIdx) => (
                <td 
                  key={colIdx} 
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
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
