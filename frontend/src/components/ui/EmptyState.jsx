import React from 'react';

/**
 * Shared empty-state placeholder.
 *
 * Each consumer may pass a `className` to override the wrapper styling
 * so that existing visual differences across pages are preserved exactly.
 *
 * Superset API — FeesPage omits `action`, Result/Examination include it.
 */
export const EmptyState = ({ icon: Icon, title, subtitle, action, className }) => (
  <div className={className || 'text-center py-16'}>
    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Icon className="text-gray-300" size={24} />
    </div>
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);
