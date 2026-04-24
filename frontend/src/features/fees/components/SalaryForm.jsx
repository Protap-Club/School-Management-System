import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FaTimes, FaPlus, FaArrowLeft, FaSearch, FaUser, FaChevronDown, FaCheck } from 'react-icons/fa';
import { MONTH_LABELS } from '@/features/fees';
import { useUsers } from '@/features/users/api/queries';

const INITIAL_FORM = {
    teacherId: '',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
};

const SearchableSelect = ({ label, options, selectedId, onSelect, error, loading, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => String(opt._id) === String(selectedId));

    const filteredOptions = options.filter(opt => 
        opt.name.toLowerCase().includes(search.toLowerCase()) || 
        opt.email.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{label} *</label>
            <button
                type="button"
                onClick={() => !loading && setIsOpen(!isOpen)}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold transition-all flex items-center justify-between bg-white ${
                    error ? 'border-red-300 ring-2 ring-red-50' : 'border-gray-200 hover:border-primary/40 shadow-sm'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className="flex items-center gap-2 truncate">
                    {loading ? (
                        <div className="flex items-center gap-2 text-gray-400 italic">
                            <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
                            Loading...
                        </div>
                    ) : selectedOption ? (
                        <>
                            <div className="w-5 h-5 bg-primary/10 rounded-md flex items-center justify-center text-primary">
                                <FaUser size={10} />
                            </div>
                            <span className="text-gray-900">{selectedOption.name}</span>
                            <span className="text-[10px] text-gray-400 font-medium">({selectedOption.email})</span>
                        </>
                    ) : (
                        <span className="text-gray-400 font-medium">{placeholder}</span>
                    )}
                </div>
                <FaChevronDown size={10} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 flex items-center gap-3 bg-white">
                        <FaSearch size={12} className="text-gray-300" />
                        <input
                            type="text"
                            placeholder="Search teacher by name or email..."
                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-medium py-0.5 placeholder:text-gray-300 text-gray-700"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="h-[1px] bg-gray-50 mx-4" />
                    <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <div className="text-gray-300 mb-2"><FaUser size={24} className="mx-auto opacity-20" /></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching teachers</span>
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt._id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(opt._id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-colors group ${
                                        String(selectedId) === String(opt._id) ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                            String(selectedId) === String(opt._id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-white border border-transparent group-hover:border-gray-100 shadow-sm'
                                        }`}>
                                            <FaUser size={12} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold group-hover:text-gray-900 transition-colors">{opt.name}</span>
                                            <span className="text-[10px] font-medium text-gray-400 tracking-tight">{opt.email}</span>
                                        </div>
                                    </div>
                                    {String(selectedId) === String(opt._id) && <FaCheck size={10} className="text-primary" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
            {error && <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-bold">{error}</p>}
        </div>
    );
};

const SalaryForm = ({ onCancel, onSubmit, isLoading, salaryData = [] }) => {
    const [form, setForm] = useState({ ...INITIAL_FORM });
    const [errors, setErrors] = useState({});

    // Real-time Duplicate Check
    const duplicateRecord = React.useMemo(() => {
        if (!form.teacherId || !form.month || !form.year) return null;
        return salaryData.find(s => 
            String(s.teacherId?._id || s.teacherId) === String(form.teacherId) && 
            Number(s.month) === Number(form.month) && 
            Number(s.year) === Number(form.year)
        );
    }, [form.teacherId, form.month, form.year, salaryData]);

    const isPaid = duplicateRecord?.status === 'PAID';
    const isDuplicate = !!duplicateRecord;

    // Fetch teachers for the dropdown
    const { data: teachersData, isLoading: teachersLoading } = useUsers({ role: 'teacher', pageSize: 150 });
    const teachers = teachersData?.data?.users || [];

    const handleChange = useCallback((field, value) => {
        setForm(prev => {
            const next = { ...prev, [field]: value };
            
            // Auto-populate amount if teacher is selected and has expectedSalary
            if (field === 'teacherId' && value) {
                const selectedTeacher = teachers.find(t => String(t._id) === String(value));
                if (selectedTeacher?.profile?.expectedSalary) {
                    next.amount = selectedTeacher.profile.expectedSalary;
                }
            }
            return next;
        });
        setErrors(prev => ({ ...prev, [field]: '' }));
    }, [teachers]);

    const validate = () => {
        const e = {};
        if (!form.teacherId) e.teacherId = 'Required';
        if (!form.amount || Number(form.amount) < 0) e.amount = 'Valid amount required';
        if (!form.month) e.month = 'Required';
        if (!form.year || form.year < 2000) e.year = 'Valid year required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        onSubmit({
            ...form,
            amount: Number(form.amount),
            month: Number(form.month),
            year: Number(form.year),
        });
    };

    const inputCls = (field) =>
        `w-full px-4 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all border-gray-200 hover:border-primary/40 shadow-sm ${errors[field] ? 'border-red-300 ring-2 ring-red-50 bg-red-50/10' : 'bg-gray-50/10'}`;

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden animate-fadeIn shadow-2xl shadow-gray-200/50 max-w-lg mx-auto">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-3">
                    <button onClick={onCancel} className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-100 shadow-sm group">
                        <FaArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 tracking-tight">Add Teacher Salary</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Process Monthly Payout</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Row 1: Teacher Select (Searchable) */}
                <SearchableSelect 
                    label="Select Teacher"
                    options={teachers}
                    selectedId={form.teacherId}
                    onSelect={(id) => handleChange('teacherId', id)}
                    error={errors.teacherId}
                    loading={teachersLoading}
                    placeholder="Select Teacher"
                />

                {/* Row 2: Amount, Month, Year */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Salary Amount (₹) *</label>
                        <input 
                            type="number" 
                            value={form.amount} 
                            onChange={(e) => handleChange('amount', e.target.value)}
                            className={inputCls('amount')} 
                            placeholder="0" 
                            min={0} 
                        />
                        {errors.amount && <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-bold">{errors.amount}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Payout Month *</label>
                        <select 
                            value={form.month} 
                            onChange={(e) => handleChange('month', e.target.value)} 
                            className={inputCls('month')}
                        >
                            <option value="" disabled hidden>Month</option>
                            {MONTH_LABELS.map((label, idx) => idx > 0 && (
                                <option key={idx} value={idx}>{label}</option>
                            ))}
                        </select>
                        {errors.month && <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-bold">{errors.month}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Payout Year *</label>
                        <input 
                            type="number" 
                            value={form.year} 
                            onChange={(e) => handleChange('year', e.target.value)}
                            className={inputCls('year')} 
                            min={2000} 
                            max={2100} 
                        />
                        {errors.year && <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-bold">{errors.year}</p>}
                    </div>
                </div>

                {/* Duplicate / Paid Warning Overlay */}
                {isDuplicate && (
                    <div className={`p-4 rounded-2xl border flex items-start gap-4 animate-fadeIn slide-in-from-top-2 duration-300 ${
                        isPaid ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                    }`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                            isPaid ? 'bg-emerald-200/50 text-emerald-600' : 'bg-amber-200/50 text-amber-600'
                        }`}>
                            {isPaid ? <FaCheck size={12} /> : <FaSearch size={12} />}
                        </div>
                        <div>
                            <p className="font-black text-[10px] uppercase tracking-[0.15em] mb-0.5">
                                {isPaid ? 'Payout Already Processed' : 'Existing record found'}
                            </p>
                            <p className="text-xs font-medium leading-relaxed opacity-90">
                                {isPaid 
                                    ? `A salary record for this month has already been marked as PAID on ${new Date(duplicateRecord.paidDate).toLocaleDateString()}.`
                                    : 'A PENDING salary record already exists for this teacher for the selected month.'
                                }
                            </p>
                        </div>
                    </div>
                )}

                <div className="pt-8 border-t border-gray-100 flex gap-4">
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        disabled={isLoading}
                        className="flex-1 px-6 py-3.5 border-2 border-gray-100 text-gray-400 text-[11px] font-black rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50 uppercase tracking-widest"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={isLoading || isDuplicate}
                        className="flex-1 px-6 py-3.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-black rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 group uppercase tracking-widest"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="flex items-center gap-2">
                                <FaPlus size={12} className="group-hover:rotate-90 transition-transform" />
                                {isDuplicate ? (isPaid ? 'Already Paid' : 'Exists') : 'Create Salary Entry'}
                            </span>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SalaryForm;
