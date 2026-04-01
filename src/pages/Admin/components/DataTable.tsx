import { type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface PaginationConfig {
  page: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T extends { id: number }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  filters?: ReactNode;
  emptyMessage?: string;
  pagination?: PaginationConfig;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onRowClick?: (item: T) => void;
}

export default function DataTable<T extends { id: number }>({
  columns,
  data,
  loading = false,
  filters,
  emptyMessage = 'No se encontraron resultados.',
  pagination,
  onEdit,
  onDelete,
  onRowClick,
}: DataTableProps<T>) {
  const hasActions = !!(onEdit || onDelete);

  return (
    <>
      {/* Toolbar with filters */}
      {filters && (
        <div className="admin-toolbar">
          <div className="admin-filters">{filters}</div>
        </div>
      )}

      {/* Table */}
      <div className="admin-table-container">
        {loading && (
          <div className="admin-loading-overlay">Cargando...</div>
        )}

        {!loading && data.length === 0 ? (
          <div className="admin-empty">{emptyMessage}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                {hasActions && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} onClick={() => onRowClick?.(item)} style={onRowClick ? { cursor: 'pointer' } : undefined}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                  {hasActions && (
                    <td onClick={e => e.stopPropagation()}>
                      {onEdit && (
                        <button
                          className="action-btn edit"
                          onClick={() => onEdit(item)}
                        >
                          Editar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="action-btn delete"
                          onClick={() => onDelete(item)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="pagination">
          <div className="pagination-info">
            Total: {pagination.totalCount} registros
          </div>
          <div className="pagination-buttons">
            <button
              className="pagination-btn"
              disabled={!pagination.hasPrev}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Anterior
            </button>
            <span className="pagination-page">
              Pagina {pagination.page}
            </span>
            <button
              className="pagination-btn"
              disabled={!pagination.hasNext}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}
