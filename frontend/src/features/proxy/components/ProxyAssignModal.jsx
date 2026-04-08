import React, { useState, useMemo } from "react";
import { FaTimes, FaUserCheck, FaSearch, FaStar } from "react-icons/fa";
import { formatDate } from "../../../utils";
import { useAvailableTeachers, useAssignProxyTeacher } from "../api/queries";

const ProxyAssignModal = ({ isOpen, onClose, request }) => {
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [notes, setNotes] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const assignProxy = useAssignProxyTeacher();

    // Fetch available teachers
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

    // Filter teachers by search term
    const filteredTeachers = useMemo(() => {
        if (!searchTerm.trim()) return availableTeachers;
        const term = searchTerm.toLowerCase();
        return availableTeachers.filter(
            (t) =>
                t.name.toLowerCase().includes(term) ||
                t.email.toLowerCase().includes(term)
        );
    }, [availableTeachers, searchTerm]);

    // Group by relevance score
    const highlyRelevant = filteredTeachers.filter((t) => t.relevanceScore >= 10);
    const moderatelyRelevant = filteredTeachers.filter(
        (t) => t.relevanceScore >= 5 && t.relevanceScore < 10
    );
    const otherTeachers = filteredTeachers.filter((t) => t.relevanceScore < 5);

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
                {/* Header */}
                <div className="px-6 py-5 flex items-center justify-between bg-white border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <FaUserCheck className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                Assign Proxy Teacher
                            </h3>
                            <p className="text-xs text-gray-500">
                                Select a teacher to cover this class
                            </p>
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
                    {/* Request Summary */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Date
                                </p>
                                <p className="text-sm font-bold text-gray-900">
                                    {formatDate(request.date)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Time
                                </p>
                                <p className="text-sm font-bold text-gray-900">
                                    {request.timeSlotId?.startTime} -{" "}
                                    {request.timeSlotId?.endTime}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Class
                                </p>
                                <p className="text-sm font-bold text-gray-900">
                                    {request.standard}-{request.section}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Subject
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                                {request.subject || "No subject specified"}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
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

                    {/* Loading State */}
                    {isLoading && (
                        <div className="py-8 text-center text-gray-500">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                Finding available teachers...
                            </div>
                        </div>
                    )}

                    {/* No Teachers Found */}
                    {!isLoading && filteredTeachers.length === 0 && (
                        <div className="py-8 text-center">
                            <p className="text-gray-500 mb-2">
                                No available teachers found for this time slot.
                            </p>
                            <p className="text-sm text-gray-400">
                                All teachers are either teaching or already assigned as proxies.
                            </p>
                        </div>
                    )}

                    {/* Teacher Lists */}
                    {!isLoading && filteredTeachers.length > 0 && (
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                {/* Highly Relevant */}
                                {highlyRelevant.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                                            <FaStar className="text-green-500" size={14} />
                                            Best Matches (Same Subject)
                                        </h4>
                                        <div className="space-y-2">
                                            {highlyRelevant.map((teacher) => (
                                                <TeacherOption
                                                    key={teacher._id}
                                                    teacher={teacher}
                                                    selected={selectedTeacherId === teacher._id}
                                                    onSelect={() =>
                                                        setSelectedTeacherId(teacher._id)
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Moderately Relevant */}
                                {moderatelyRelevant.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                                            <FaStar className="text-blue-500" size={14} />
                                            Familiar with Class
                                        </h4>
                                        <div className="space-y-2">
                                            {moderatelyRelevant.map((teacher) => (
                                                <TeacherOption
                                                    key={teacher._id}
                                                    teacher={teacher}
                                                    selected={selectedTeacherId === teacher._id}
                                                    onSelect={() =>
                                                        setSelectedTeacherId(teacher._id)
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Other Teachers */}
                                {otherTeachers.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-700 mb-2">
                                            Other Available Teachers
                                        </h4>
                                        <div className="space-y-2">
                                            {otherTeachers.map((teacher) => (
                                                <TeacherOption
                                                    key={teacher._id}
                                                    teacher={teacher}
                                                    selected={selectedTeacherId === teacher._id}
                                                    onSelect={() =>
                                                        setSelectedTeacherId(teacher._id)
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
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

                            {/* Actions */}
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

// Teacher Option Component
const TeacherOption = ({ teacher, selected, onSelect }) => {
    const subjects = teacher.profile?.subjects || [];
    const assignedClasses = teacher.profile?.assignedClasses || [];

    return (
        <div
            onClick={onSelect}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selected
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                    }`}
                >
                    {selected && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h5 className="font-bold text-gray-900">{teacher.name}</h5>
                        {teacher.relevanceScore > 0 && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                {teacher.relevanceScore >= 10
                                    ? "Same Subject"
                                    : "Knows Class"}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">{teacher.email}</p>

                    {/* Subjects */}
                    {subjects.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {subjects.slice(0, 3).map((subject, idx) => (
                                <span
                                    key={idx}
                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                >
                                    {subject}
                                </span>
                            ))}
                            {subjects.length > 3 && (
                                <span className="text-xs text-gray-400">
                                    +{subjects.length - 3} more
                                </span>
                            )}
                        </div>
                    )}

                    {/* Assigned Classes */}
                    {assignedClasses.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                            Teaches:{" "}
                            {assignedClasses
                                .map((c) => `${c.standard}-${c.section}`)
                                .join(", ")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProxyAssignModal;
