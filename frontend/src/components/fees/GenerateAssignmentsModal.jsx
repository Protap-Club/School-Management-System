import React, { useState } from 'react';
import { FaTimes, FaBolt } from 'react-icons/fa';
import { MONTH_LABELS } from '../../features/fees';

const GenerateAssignmentsModal = ({ isOpen, onClose, onSubmit, structure, isLoading }) => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [errors, setErrors] = useState({});

    if (!isOpen || !structure) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = {};
        if (!month) errs.month = 'Required';
        if (!year || year < 2000) errs.year = 'Required';
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        onSubmit({ structureId: structure._id, month: Number(month), year: Number(year) });
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                            <FaBolt className="text-violet-600" size={16} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Generate Assignments</h3>
                            <p className="text-xs text-gray-500">{structure.name} — {structure.standard}-{structure.section}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><FaTimes className="text-gray-400" size={16} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-violet-50 rounded-xl p-3 text-sm text-violet-700">
                        This will create fee assignments for all students in <strong>{structure.standard}-{structure.section}</strong> for the selected month.
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Month *</label>
                            <select value={month} onChange={(e) => setMonth(e.target.value)}
                                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.month ? 'border-red-300' : 'border-gray-200'}`}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{MONTH_LABELS[m]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Year *</label>
                            <input type="number" value={year} onChange={(e) => setYear(e.target.value)}
                                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.year ? 'border-red-300' : 'border-gray-200'}`}
                                min={2000} max={2100} />
                        </div>
                    </div>
                </form>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} disabled={isLoading}
                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={isLoading}
                        className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                        {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Generating...</>
                            : <><FaBolt size={12} />Generate</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenerateAssignmentsModal;
