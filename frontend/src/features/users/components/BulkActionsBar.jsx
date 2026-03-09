import React from 'react';
import { FaEdit, FaArchive, FaTimes, FaUndo } from 'react-icons/fa';

export const BulkActionsBar = ({
    selectedCount,
    showArchived,
    canArchive = true,
    onEdit,
    onDelete,
    onCancel
}) => {
    return (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="bg-indigo-600 text-white text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center">
                    {selectedCount}
                </span>
                <span className="text-indigo-700 text-sm font-medium">
                    {selectedCount === 1 ? 'user' : 'users'} selected
                </span>
            </div>

            <div className="flex items-center gap-2">
                {selectedCount === 1 && !showArchived && (
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-50 transition-colors text-sm font-medium"
                    >
                        <FaEdit size={11} /> Edit
                    </button>
                )}

                {canArchive && (
                    <button
                        onClick={onDelete}
                        disabled={selectedCount === 0}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 ${showArchived ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {showArchived ? <FaUndo size={11} /> : <FaArchive size={11} />}
                        {showArchived ? 'Restore' : 'Archive'}
                        {selectedCount > 1 && ` (${selectedCount})`}
                    </button>
                )}

                <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                    <FaTimes size={11} /> Cancel
                </button>
            </div>
        </div>
    );
};
