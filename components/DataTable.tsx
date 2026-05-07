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
    <div className="overflow-x-auto rounded-[2.5rem] border border-border/50 shadow-2xl shadow-primary/5 bg-card/50 backdrop-blur-md">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border/50">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-10 py-8 text-left text-xs font-black text-muted-foreground uppercase tracking-[0.3em]"
              >
                {column.label}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="px-10 py-8 text-left text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`transition-all duration-300 ${onRowClick ? 'hover:bg-primary/5 cursor-pointer group' : ''}`}
            >
              {columns.map((column) => (
                <td
                  key={`${row.id}-${String(column.key)}`}
                  className="px-10 py-8 text-lg font-bold text-foreground tracking-tight"
                >
                  {column.render
                    ? column.render((row as any)[column.key], row)
                    : ((row as any)[column.key] ?? '—').toString()}
                </td>
              ))}
              {actions && actions.length > 0 && (
                <td className="px-10 py-8">
                  <div className="flex gap-4">
                    {actions.map((action) => (
                      <button
                        key={action.label}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick(row);
                        }}
                        className={
                          action.className ||
                          'px-6 py-2.5 bg-primary/10 text-primary rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all duration-300'
                        }
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
