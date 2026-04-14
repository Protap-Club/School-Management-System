import React, { useState } from "react";
import { FaTimes, FaCalendarAlt, FaExclamationTriangle } from "react-icons/fa";
import { useCreateProxyRequest } from "../api/queries";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateOnlyString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const MarkUnavailableModal = ({ isOpen, onClose, slotInfo, onSuccess, onError }) => {
    const [reason, setReason] = useState("");

    const createRequest = useCreateProxyRequest();

    if (!isOpen || !slotInfo) return null;

    const { dayOfWeek, timeSlot, date: selectedDate, subject, standard, section } = slotInfo;

    // Format date for display
    const formatDateLabel = (date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Validate that the selected date matches the day of week
    const validateDate = (date) => {
        if (!date) return "No date selected";
        const dayName = DAYS_OF_WEEK[date.getDay()];
        if (dayName !== dayOfWeek) {
            return `Selected date is ${dayName}, but this class is on ${dayOfWeek}.`;
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate date
        const dateError = validateDate(selectedDate);
        if (dateError) {
            onError?.(dateError);
            return;
        }

        try {
            await createRequest.mutateAsync({
                date: toDateOnlyString(selectedDate),
                dayOfWeek,
                timeSlotId: timeSlot._id || timeSlot.id,
                reason: reason.trim() || undefined,
            });

            onSuccess?.();
            onClose();
            setReason("");
        } catch (err) {
            onError?.(err.response?.data?.message || err.response?.data?.error?.message || "Failed to create proxy request");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[70vh] overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="px-6 py-5 flex items-center justify-between bg-white border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <FaCalendarAlt className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Mark Unavailable</h3>
                            <p className="text-xs text-gray-500">Request proxy for this class</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(70vh-80px)]">
                    {/* Class Info - 2 column layout */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Date & Day */}
                            <div className="col-span-2 pb-3 border-b border-gray-200">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</p>
                                <p className="text-lg font-bold text-gray-900">{formatDateLabel(selectedDate)}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Click a different column in the timetable to select another date
                                </p>
                            </div>

                            {/* Time & Period */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {timeSlot.startTime} - {timeSlot.endTime}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</p>
                                <p className="text-sm font-bold text-gray-900">#{timeSlot.slotNumber}</p>
                            </div>

                            {/* Class Info */}
                            <div className="col-span-2 pt-2 border-t border-gray-200">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</p>
                                <p className="text-sm font-bold text-gray-900">{standard}-{section} • {subject || "No subject"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={16} />
                            <p className="text-xs text-amber-700">
                                By marking unavailable, you request admin to assign a proxy teacher
                                or mark this as a free period. Your class will be notified.
                            </p>
                        </div>
                    </div>

                    
                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason (Optional)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., Medical appointment, Personal leave, etc."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-none"
                                rows={3}
                                maxLength={500}
                            />
                            <p className="mt-1 text-xs text-gray-400 text-right">
                                {reason.length}/500
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createRequest.isPending}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all font-medium text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {createRequest.isPending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    "Mark Unavailable"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MarkUnavailableModal;
