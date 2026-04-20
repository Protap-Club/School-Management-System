import React, { useState } from 'react';
import { IoClose, IoAddCircleOutline } from 'react-icons/io5';
import { useCreateFeeType, useCreatePenaltyType } from '../../features/fees/api/queries';

const CARD_CONFIG = {
    fee: {
        title: 'New Fee Type',
        subtitle: 'Define a custom fee category',
        fieldLabel: 'Fee Type Name',
        placeholder: 'e.g. Annual Sports Fee',
        helperText: 'The display name for this fee category',
        errorText: 'Fee Type Name is required',
        saveLabel: 'Save Fee Type',
    },
    penalty: {
        title: 'New Penalty Type',
        subtitle: 'Define a custom penalty category',
        fieldLabel: 'Penalty Type Name',
        placeholder: 'e.g. Bus Damage Fine',
        helperText: 'The display name for this penalty category',
        errorText: 'Penalty Type Name is required',
        saveLabel: 'Save Penalty Type',
    },
};

const FeeTypeSideCard = ({ onClose, onSuccess, variant = 'fee' }) => {
    const [label, setLabel] = useState('');
    const [error, setError] = useState('');
    const config = CARD_CONFIG[variant] || CARD_CONFIG.fee;
    const createFeeType = useCreateFeeType();
    const createPenaltyType = useCreatePenaltyType();
    const createType = variant === 'penalty' ? createPenaltyType : createFeeType;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!label) {
            setError(config.errorText);
            return;
        }

        // Generate system name: TUITION_FEE from "Tuition Fee"
        const name = label.trim().toUpperCase().replace(/\s+/g, '_');

        try {
            await createType.mutateAsync({
                name, 
                label: label.trim()
            });
            onSuccess(name);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || `Failed to create ${variant} type`);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-80">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{config.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{config.subtitle}</p>
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
                        {config.fieldLabel}
                    </label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder={config.placeholder}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-300"
                        autoFocus
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5 px-1 italic">
                        {config.helperText}
                    </p>
                </div>

                {error && (
                    <div className="px-4 py-3 bg-red-50 text-red-600 text-[11px] font-bold rounded-xl border border-red-100 flex items-center gap-2">
                        <span className="w-1 h-1 bg-red-600 rounded-full" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={createType.isPending}
                    className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {createType.isPending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <IoAddCircleOutline size={18} />
                    )}
                    {config.saveLabel}
                </button>
            </form>
        </div>
    );
};

export default FeeTypeSideCard;
