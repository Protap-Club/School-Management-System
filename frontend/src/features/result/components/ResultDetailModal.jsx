import React from 'react';
import {
  FaAward,
  FaCheckCircle,
  FaPlus,
  FaPrint,
  FaTimes,
} from 'react-icons/fa';

const statusStyles = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  published: 'bg-blue-50 text-blue-700 border-blue-200',
  locked: 'bg-rose-50 text-rose-700 border-rose-200',
};

const resultStyles = {
  pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  fail: 'bg-rose-50 text-rose-700 border-rose-200',
};

const InfoCard = ({ label, value, color = 'text-slate-900' }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
    <div className={`text-xl font-bold ${color}`}>{value}</div>
  </div>
);

const ResultDetailModal = ({ isOpen, result, onClose, onEdit }) => {
  if (!isOpen || !result) {
    return null;
  }

  const canEdit = result.summary?.canEdit;
  const statusClass = statusStyles[result.summary?.status] || statusStyles.draft;
  const passClass = resultStyles[result.summary?.resultStatus] || resultStyles.pass;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[30px] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FaAward size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 truncate">
                {result.student?.name}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {result.exam?.name} · Roll {result.student?.rollNumber || '-'} · Class {result.student?.standard} - {result.student?.section}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100"
          >
            <FaTimes className="mx-auto" size={16} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          <div className="p-6 md:p-8 space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold capitalize ${statusClass}`}>
                <FaCheckCircle size={12} />
                {result.summary?.status}
              </span>
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold uppercase ${passClass}`}>
                {result.summary?.resultStatus}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700">
                Grade {result.summary?.grade}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700">
                {result.summary?.promoted ? 'Promoted' : 'Not Promoted'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InfoCard label="Total Marks" value={result.summary?.totalMarks ?? 0} />
              <InfoCard label="Obtained Marks" value={result.summary?.obtainedMarks ?? 0} color="text-primary" />
              <InfoCard label="Percentage" value={`${result.summary?.percentage ?? 0}%`} color="text-emerald-600" />
              <InfoCard label="Editable Until" value={result.summary?.editableUntil ? new Date(result.summary.editableUntil).toLocaleDateString() : 'Locked'} />
            </div>

            <div className="rounded-3xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                <h3 className="font-semibold text-slate-900">Subject-wise Result</h3>
                <p className="text-sm text-slate-500 mt-1">Detailed marks breakdown for this result.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Max Marks</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Obtained</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(result.subjects || []).map((item) => (
                      <tr key={item.subject} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{item.subject}</td>
                        <td className="px-6 py-4 text-slate-600">{item.maxMarks}</td>
                        <td className="px-6 py-4 text-slate-900 font-semibold">{item.obtainedMarks}</td>
                        <td className="px-6 py-4 text-slate-600">{item.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 py-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <FaPrint size={14} />
              <span>Print</span>
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-5 py-3 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <FaPlus size={12} />
                <span>Edit Result</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDetailModal;
