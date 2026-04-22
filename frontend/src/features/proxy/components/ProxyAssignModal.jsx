import React, { useMemo, useState } from "react";
import { FaTimes, FaUserCheck, FaSearch } from "react-icons/fa";
import { formatDate } from "../../../utils";
import { useAvailableTeachers, useAssignProxyTeacher } from "../api/queries";

const ProxyAssignModal = ({ isOpen, onClose, request }) => {
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [notes, setNotes] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const assignProxy = useAssignProxyTeacher();

    const { data: teachersData, isLoading } = useAvailableTeachers(
        request
            ? {
                date: request.date,
                dayOfWeek: request.dayOfWeek,
                timeSlotId: request.timeSlotId?._id || request.timeSlotId,
                subject: request.subject,
                standard: request.standard,
                section: request.section,
            }
            : null,
        { enabled: !!request }
    );

    const availableTeachers = teachersData?.data || [];

    const filteredTeachers = useMemo(() => {
        if (!searchTerm.trim()) return availableTeachers;
        const term = searchTerm.toLowerCase();
        return availableTeachers.filter(
            (teacher) =>
                teacher.name?.toLowerCase().includes(term) ||
                teacher.email?.toLowerCase().includes(term)
        );
    }, [availableTeachers, searchTerm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTeacherId) return;

        try {
            await assignProxy.mutateAsync({
                requestId: request._id,
                data: {
                    proxyTeacherId: selectedTeacherId,
                    notes: notes.trim() || undefined,
                },
            });
            onClose();
            setSelectedTeacherId("");
            setNotes("");
            setSearchTerm("");
        } catch (err) {
            console.error("Failed to assign proxy:", err);
        }
    };

    if (!isOpen || !request) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="px-6 py-5 flex items-center justify-between bg-white border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <FaUserCheck className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Assign Proxy Teacher</h3>
                            <p className="text-xs text-gray-500">Choose from currently free teachers only</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</p>
                                <p className="text-sm font-bold text-gray-900">{formatDate(request.date)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {request.timeSlotId?.startTime} - {request.timeSlotId?.endTime}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</p>
                                <p className="text-sm font-bold text-gray-900">{request.standard}-{request.section}</p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</p>
                            <p className="text-sm font-bold text-gray-900">{request.subject || "No subject specified"}</p>
                        </div>
                    </div>

                    <div className="mb-4 relative">
                        <FaSearch
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={16}
                        />
                        <input
                            type="text"
                            placeholder="Search teachers by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {isLoading && (
                        <div className="py-8 text-center text-gray-500">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                Finding available teachers...
                            </div>
                        </div>
                    )}

                    {!isLoading && filteredTeachers.length === 0 && (
                        <div className="py-8 text-center">
                            <p className="text-gray-500 mb-2">No available teachers found for this time slot.</p>
                            <p className="text-sm text-gray-400">
                                All teachers are either teaching or already assigned as proxies.
                            </p>
                        </div>
                    )}

                    {!isLoading && filteredTeachers.length > 0 && (
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                {filteredTeachers.map((teacher) => (
                                    <TeacherOption
                                        key={teacher._id}
                                        teacher={teacher}
                                        selected={selectedTeacherId === teacher._id}
                                        onSelect={() => setSelectedTeacherId(teacher._id)}
                                    />
                                ))}
                            </div>

                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assignment Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g., Please bring the worksheets prepared for this class"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                                    rows={2}
                                    maxLength={500}
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedTeacherId || assignProxy.isPending}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {assignProxy.isPending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Assigning...
                                        </>
                                    ) : (
                                        <>
                                            <FaUserCheck size={16} />
                                            Assign Proxy
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeacherOption = ({ teacher, selected, onSelect }) => {
    return (
        <div
            onClick={onSelect}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                        }`}
                >
                    {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div className="flex-1">
                    <h5 className="font-bold text-gray-900">{teacher.name}</h5>
                    <p className="text-sm text-gray-500">{teacher.email}</p>
                </div>
            </div>
        </div>
    );
};

export default ProxyAssignModal;
