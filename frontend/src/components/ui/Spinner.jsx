/**
 * Shared spinner components — replaces 30+ inline spinner divs.
 *
 * ButtonSpinner: small white-on-colored-bg spinner for buttons (11 occurrences)
 * PageSpinner:   page-level gray loading spinner (6+ occurrences, configurable size)
 */

// Small inline button spinner (white-on-colored-bg)
export const ButtonSpinner = ({ className }) => (
  <div className={className || 'w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin'} />
);

// Page-level loading spinner (configurable size)
export const PageSpinner = ({ size = 'h-8 w-8', className }) => (
  <div className={className || `animate-spin rounded-full ${size} border-2 border-gray-200 border-t-gray-600`} />
);
