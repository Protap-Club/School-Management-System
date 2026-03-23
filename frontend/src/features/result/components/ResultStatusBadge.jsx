import React from 'react';

const RESULT_STATUS_STYLES = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  published: {
    label: 'Published',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  locked: {
    label: 'Locked',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const PASS_FAIL_STYLES = {
  pass: {
    label: 'Pass',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  fail: {
    label: 'Fail',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export const StatusBadge = ({ status }) => {
  const style = RESULT_STATUS_STYLES[status] || RESULT_STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${style.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {style.label}
    </span>
  );
};

export const OutcomeBadge = ({ outcome }) => {
  const style = PASS_FAIL_STYLES[outcome] || PASS_FAIL_STYLES.pass;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold uppercase ${style.className}`}>
      {style.label}
    </span>
  );
};
