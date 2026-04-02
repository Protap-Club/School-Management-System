/**
 * Skeleton loading rows for table bodies.
 *
 * Consolidates FeesPage `SkeletonRow({ cols })` and ResultPage `SkeletonRows({ rows, columns })`.
 * Callers replace `Array.from(...).map(...)` wrappers with a single <SkeletonRows /> call.
 *
 * @param {number} rows     – number of placeholder rows (default 5)
 * @param {number} columns  – number of <td> shimmers per row (default 4)
 * @param {string} cellClass – td padding class override (default 'px-4 py-3')
 * @param {string} barClass  – shimmer bar class override (default 'h-4 bg-gray-100 rounded-lg w-3/4')
 */
export const SkeletonRows = ({
  rows = 5,
  columns = 4,
  cellClass = 'px-4 py-3',
  barClass = 'h-4 bg-gray-100 rounded-lg w-3/4',
}) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        {Array.from({ length: columns }).map((__, j) => (
          <td key={j} className={cellClass}>
            <div className={barClass} />
          </td>
        ))}
      </tr>
    ))}
  </>
);
