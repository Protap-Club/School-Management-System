import React, { useMemo, useState } from 'react';
import {
  FaCalculator,
  FaCheckCircle,
  FaPlus,
  FaSave,
  FaTimes,
} from 'react-icons/fa';
import { ButtonSpinner } from '../../../components/ui/Spinner';

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const buildInitialSubjects = (exam, currentResult) => {
  const currentSubjects = new Map(
    (currentResult?.subjects || []).map((item) => [item.subject, item])
  );

  return (exam?.subjects || []).map((item) => ({
    subject: item.subject,
    maxMarks: item.maxMarks,
    passingMarks: item.passingMarks || 0,
    obtainedMarks: toNumber(currentSubjects.get(item.subject)?.obtainedMarks ?? ''),
  }));
};

const ResultEntryModal = ({
  isOpen,
  exam,
  student,
  currentResult,
  onClose,
  onSubmit,
  isSaving,
  studentPositionLabel = '',
}) => {
  const [subjects, setSubjects] = useState(() => buildInitialSubjects(exam, currentResult));
  const [error, setError] = useState('');

  const isLocked = currentResult?.summary?.status === 'locked';

  const preview = useMemo(() => {
    const totalMarks = subjects.reduce((sum, item) => sum + Number(item.maxMarks || 0), 0);
    const obtainedMarks = subjects.reduce(
      (sum, item) => sum + Number(item.obtainedMarks || 0),
      0
    );
    const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : '0.00';
    return { totalMarks, obtainedMarks, percentage };
  }, [subjects]);

  if (!isOpen || !exam || !student) {
    return null;
  }

  const handleChange = (index, value) => {
    setSubjects((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return {
          ...item,
          obtainedMarks: value === '' ? '' : Number(value),
        };
      })
    );
  };

  const validateAndBuildPayload = () => {
    if (isLocked) return;

    const hasMissingMarks = subjects.some(
      (item) => item.obtainedMarks === '' || item.obtainedMarks === null || item.obtainedMarks === undefined
    );

    if (hasMissingMarks) {
      setError('Please enter obtained marks for every subject.');
      return;
    }

    const invalidMarks = subjects.find(
      (item) => Number(item.obtainedMarks) < 0 || Number(item.obtainedMarks) > Number(item.maxMarks)
    );

    if (invalidMarks) {
      setError(`Marks for ${invalidMarks.subject} must be between 0 and ${invalidMarks.maxMarks}.`);
      return;
    }

    setError('');
    return {
      examId: exam._id,
      studentId: student.studentId,
      subjects: subjects.map((item) => ({
        subject: item.subject,
        maxMarks: item.maxMarks,
        obtainedMarks: Number(item.obtainedMarks),
      })),
    };
  };

  const handleSubmit = async (event, options = {}) => {
    event?.preventDefault?.();
    const payload = validateAndBuildPayload();
    if (!payload) {
      return;
    }

    await onSubmit(payload, options);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[28px] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/60">
        <div className="px-6 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {currentResult ? <FaSave size={18} /> : <FaPlus size={18} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-slate-900 truncate">
                {currentResult ? 'Edit Result' : 'Add Result'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {student.name} · Roll {student.rollNumber || '-'} · {exam.name}
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

        <form onSubmit={(event) => handleSubmit(event, { moveToNext: true })}>
          <div className="p-6 md:p-8 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
              <div className="space-y-4">
                <div className="rounded-[28px] overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-primary shadow-xl shadow-slate-900/10 text-white">
                  <div className="p-6">
                    <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/60">
                      Result Entry
                    </div>
                    <h3 className="text-2xl font-bold mt-3">{student.name}</h3>
                    <p className="text-sm text-white/75 mt-1">
                      Roll {student.rollNumber || '-'} • Class {exam.standard} - {exam.section}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                          Status
                        </div>
                        <div className="text-lg font-semibold mt-2 capitalize">
                          {currentResult?.summary?.status || 'draft'}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                          Position
                        </div>
                        <div className="text-lg font-semibold mt-2">
                          {studentPositionLabel || 'Current'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <FaCalculator size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Exam Snapshot</div>
                      <div className="text-xs text-slate-500">Current marks summary</div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Subjects
                      </div>
                      <div className="text-xl font-bold text-slate-900">{exam.subjects?.length || 0}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Total
                      </div>
                      <div className="text-xl font-bold text-slate-900">{preview.totalMarks}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] px-4 py-3">
                        <div className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-1">
                          Obtained
                        </div>
                        <div className="text-xl font-bold text-primary">{preview.obtainedMarks}</div>
                      </div>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                        <div className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-widest mb-1">
                          Percentage
                        </div>
                        <div className="text-xl font-bold text-emerald-700">{preview.percentage}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {isLocked && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
                    This result is locked and can no longer be edited.
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80">
                    <h3 className="font-semibold text-slate-900">Subject Marks Entry</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Enter marks on the right and move through students without leaving this flow.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-white">
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Max Marks</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pass Marks</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Obtained Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subjects.map((item, index) => (
                          <tr key={item.subject} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">{item.subject}</div>
                              <div className="text-xs text-slate-500 mt-1">Subject mark entry</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold">
                                {item.maxMarks}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                                {item.passingMarks}
                              </span>
                            </td>
                            <td className="px-6 py-4 min-w-[240px]">
                              <input
                                type="number"
                                min="0"
                                max={item.maxMarks}
                                step="0.01"
                                value={item.obtainedMarks}
                                onChange={(event) => handleChange(index, event.target.value)}
                                disabled={isLocked}
                                placeholder={`0 - ${item.maxMarks}`}
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 py-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(event) => handleSubmit(event, { moveToNext: true })}
              disabled={isSaving || isLocked}
              className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <ButtonSpinner />
              ) : (
                <FaCheckCircle size={14} />
              )}
              <span>Save & Next</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResultEntryModal;
