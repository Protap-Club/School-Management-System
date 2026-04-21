import React from 'react';
import { AlertCircle, ArrowRight, UserPlus, X } from 'lucide-react';

const TeacherConflictModal = ({ isOpen, onClose, onConfirm, conflicts = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn border border-red-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6 text-white text-center relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
            <AlertCircle size={32} className="text-white" />
          </div>
          <h3 className="text-xl font-bold">Class Assignment Conflict</h3>
          <p className="text-white/80 text-sm mt-1">This class already has a class teacher</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-6">
            {conflicts.map((conflict, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Class</span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                    {conflict.classLabel || `${conflict.standard}${conflict.section}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Current Teacher</p>
                    <p className="font-semibold text-gray-800 truncate">{conflict.teacherName}</p>
                  </div>
                  <div className="text-gray-300">
                    <ArrowRight size={20} />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-xs text-blue-500 mb-1">New Teacher</p>
                    <p className="font-semibold text-blue-800">Assigning...</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="text-center space-y-3">
              <p className="text-gray-600 text-sm leading-relaxed">
                By confirming, <span className="font-bold text-red-600">the current teacher will be removed</span> as the class teacher for this class. This action cannot be undone automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-200 active:scale-[0.98]"
          >
            <UserPlus size={20} />
            Confirm & Replace
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-500 font-medium hover:text-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherConflictModal;
