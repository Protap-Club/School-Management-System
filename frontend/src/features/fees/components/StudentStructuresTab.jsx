import React from 'react';
import { FaArrowLeft, FaEdit, FaTrashAlt, FaListAlt } from 'react-icons/fa';
import { SkeletonRows } from '../../../components/ui/SkeletonRows';
import { EmptyState } from '../../../components/ui/EmptyState';
import FeeStructureForm from '../../../components/fees/FeeStructureForm';
import { FEE_TYPE_LABELS, FREQUENCY_LABELS } from '../index';

const StudentStructuresTab = ({
    structModal,
    setStructModal,
    structures,
    structLoading,
    handleUpdateStructure,
    updateMut,
    isAdmin,
    setDeleteConfirm,
}) => (
    <div className="space-y-4 animate-fadeIn">
        {structModal.editData ? (
            <>
                <button onClick={() => setStructModal({ open: false, editData: null })} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary transition-all uppercase tracking-widest">
                    <FaArrowLeft size={10} /> Back to Assigned Fees
                </button>
                <FeeStructureForm
                    key={structModal.editData._id}
                    editData={structModal.editData}
                    onCancel={() => setStructModal({ open: false, editData: null })}
                    onSubmit={async (data) => {
                        await handleUpdateStructure({ id: structModal.editData._id, data });
                        setStructModal({ open: false, editData: null });
                    }}
                    isLoading={updateMut.isPending}
                    isAdmin={isAdmin}
                />
            </>
        ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 font-display">Assigned Fee Structures</h2>
                    <p className="text-sm text-gray-500">Overview of fee schemes applicable to your assigned classes.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-gray-100 font-display">
                                {['Fee Type', 'Structure Name', 'Class', 'Amount', 'Frequency', 'Due Date'].map(h => (
                                    <th key={h} className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                ))}
                                <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 tracking-widest">Status</th>
                                <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {structLoading ? (
                                <SkeletonRows rows={5} columns={8} />
                            ) : structures.length === 0 ? (
                                <tr><td colSpan={8}><EmptyState icon={FaListAlt} title="No fee structures" subtitle="Your classes have no assigned fee structures yet." /></td></tr>
                            ) : (
                                structures.map(st => (
                                    <tr key={st._id} className="hover:bg-gray-50/25 transition-colors group">
                                        <td className="px-4 py-4">
                                            <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-bold uppercase">{FEE_TYPE_LABELS[st.feeType] || st.feeType}</span>
                                        </td>
                                        <td className="px-4 py-4 font-bold text-gray-900">{st.name}</td>
                                        <td className="px-4 py-4 text-gray-600 font-medium">Std {st.standard}-{st.section}</td>
                                        <td className="px-4 py-4 font-black text-gray-900">₹{st.amount?.toLocaleString()}</td>
                                        <td className="px-4 py-4 text-gray-600 font-medium">{FREQUENCY_LABELS[st.frequency] || st.frequency}</td>
                                        <td className="px-4 py-4 text-gray-600 font-medium">{st.dueDay}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {st.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 transition-opacity">
                                                <button onClick={() => setStructModal({ open: false, editData: st })} title="Edit Structure"
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><FaEdit size={14} /></button>
                                                <button onClick={() => setDeleteConfirm(st._id)} title="Delete Structure"
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><FaTrashAlt size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
);

export default StudentStructuresTab;
