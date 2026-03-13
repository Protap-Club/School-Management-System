import React, { useState } from 'react';
import { IoClose, IoAddCircleOutline } from 'react-icons/io5';
import { useCreateFeeType } from '../../features/fees/api/queries';

const FeeTypeSideCard = ({ onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [error, setError] = useState('');

    const createFeeType = useCreateFeeType();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!name || !label) {
            setError('Both Name and Label are required');
            return;
        }

        try {
            await createFeeType.mutateAsync({ 
                name: name.toUpperCase().replace(/\s+/g, '_'), 
                label 
            });
            onSuccess(name.toUpperCase().replace(/\s+/g, '_'));
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create fee type');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-80 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">New Fee Type</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Define a custom fee category</p>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <IoClose size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                        System Name (Internal)
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. ANNUAL_FEE"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-300"
                        autoFocus
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5 px-1 italic">
                        Uppercase, no spaces (e.g., TECH_FEE)
                    </p>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                        Display Label
                    </label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="e.g. Annual Tech Fee"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-300"
                    />
                </div>

                {error && (
                    <div className="px-4 py-3 bg-red-50 text-red-600 text-[11px] font-bold rounded-xl border border-red-100 flex items-center gap-2">
                        <span className="w-1 h-1 bg-red-600 rounded-full" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={createFeeType.isPending}
                    className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {createFeeType.isPending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <IoAddCircleOutline size={18} />
                    )}
                    Save Fee Type
                </button>
            </form>
        </div>
    );
};

export default FeeTypeSideCard;
