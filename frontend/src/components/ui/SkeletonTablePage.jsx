/**
 * SkeletonTablePage — full-page table skeleton layout.
 *
 * Composes a filter bar placeholder + column header row + SkeletonRows data rows.
 * Used for Users, AuditLog, Assignment, and any data-table page.
 *
 * @param {number} rows        – skeleton data rows (default 7)
 * @param {number} columns     – columns per row (default 5)
 * @param {boolean} showFilter – show filter bar placeholder row (default true)
 * @param {string} rowHeight   – fixed row height e.g. '48px' (default '48px')
 * @param {number} headerCols  – how many header label bones to render (defaults to columns)
 */
import { SkeletonRows } from './SkeletonRows';

export const SkeletonTablePage = ({
  rows = 7,
  columns = 5,
  showFilter = true,
  rowHeight = '48px',
  headerCols = null,
}) => {
  const hCols = headerCols ?? columns;
  // Header bone widths cycle through a few sizes for a realistic feel
  const headerWidths = ['w-20', 'w-28', 'w-36', 'w-16', 'w-24', 'w-20', 'w-24', 'w-16'];

  return (
    <div className="space-y-4">
      {/* Filter bar placeholder */}
      {showFilter && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="skeleton-shimmer h-10 rounded-xl flex-1 w-full sm:max-w-xs" />
          <div className="skeleton-shimmer h-10 rounded-xl w-32" />
          <div className="skeleton-shimmer h-10 rounded-xl w-28" />
        </div>
      )}

      {/* Table wrapper */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full border-collapse">
          {/* Header row */}
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {Array.from({ length: hCols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div
                    className={`skeleton-shimmer h-3 rounded-md ${headerWidths[i % headerWidths.length]}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          {/* Data rows */}
          <tbody className="divide-y divide-gray-50">
            <SkeletonRows
              rows={rows}
              columns={columns}
              cellClass="px-4 py-0"
              barClass="h-4 rounded-lg w-3/4"
              rowHeight={rowHeight}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};
