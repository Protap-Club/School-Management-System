/**
 * Skeleton loading rows for table bodies.
 *
 * Uses the design-token-native `.skeleton-shimmer` CSS class (defined in
 * index.css) instead of Tailwind's `animate-pulse` + hardcoded bg-gray-100.
 *
 * @param {number} rows      – number of placeholder rows (default 5)
 * @param {number} columns   – number of <td> shimmers per row (default 4)
 * @param {string} cellClass – td padding class override (default 'px-4 py-3')
 * @param {string} barClass  – shimmer bar height/width classes (NO bg- here — color handled by CSS)
 * @param {string} rowHeight – optional fixed row height e.g. '48px' (default null)
 */
export const SkeletonRows = ({
  rows = 5,
  columns = 4,
  cellClass = 'px-4 py-3',
  barClass = 'h-4 rounded-lg w-3/4',
  rowHeight = null,
}) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} style={rowHeight ? { height: rowHeight } : undefined}>
        {Array.from({ length: columns }).map((__, j) => (
          <td key={j} className={cellClass}>
            <div className={`skeleton-shimmer ${barClass}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);
