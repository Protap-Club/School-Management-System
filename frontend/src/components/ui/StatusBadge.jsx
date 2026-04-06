/**
 * Generic status badge — accepts a `styles` map keyed by status string.
 *
 * FeesPage usage:   <StatusBadge status={fee.status} styles={FEE_STATUS_STYLES} />
 * ResultPage usage: <StatusBadge status={item.summary?.status} styles={RESULT_STATUS_STYLES} />
 *
 * Each consumer defines its own styles map so domain-specific colors are preserved.
 */

const DEFAULT_STYLE = 'bg-gray-100 text-gray-600';

export const StatusBadge = ({ status, styles, className }) => {
  const s = styles[status] || DEFAULT_STYLE;

  // Support both string-based styles and object-based styles
  if (typeof s === 'string') {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s} ${className || ''}`}>
        {status}
      </span>
    );
  }

  // Object-based (e.g. { label, className, bg, text, dot })
  const label = s.label || status;
  const classes = s.className || `${s.bg || ''} ${s.text || ''}`;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${classes} ${className || ''}`}>
      {s.dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      {!s.dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
};
