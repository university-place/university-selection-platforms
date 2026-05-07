'use client';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  actions?: {
    label: string;
    onClick: (row: T) => void;
    className?: string;
  }[];
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  actions,
  loading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900"
              >
                {column.label}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
            >
              {columns.map((column) => (
                <td
                  key={`${row.id}-${String(column.key)}`}
                  className="px-6 py-4 text-sm text-gray-900"
                >
                  {column.render
                    ? column.render((row as any)[column.key], row)
                    : String((row as any)[column.key])}
                </td>
              ))}
              {actions && actions.length > 0 && (
                <td className="px-6 py-4 text-sm space-x-2 flex gap-2">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick(row);
                      }}
                      className={
                        action.className ||
                        'px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs'
                      }
                    >
                      {action.label}
                    </button>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
