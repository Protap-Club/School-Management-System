import React, { useMemo, useState } from "react";
import {
    FaCalendarAlt,
    FaUserClock,
    FaUserCheck,
    FaUserTimes,
    FaFilter,
    FaCheck,
    FaTimes,
} from "react-icons/fa";
import { formatDate } from "../../../utils";
import {
    useProxyRequests,
    useMarkAsFreePeriod
} from "../api/queries";
import { useTeachers } from "../../timetable/api/queries";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../../components/ui/select";
import ProxyAssignModal from "./ProxyAssignModal";

const STATUS_COLORS = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    resolved: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200"
};

const STATUS_ICONS = {
    pending: FaUserClock,
    resolved: FaUserCheck,
    cancelled: FaUserTimes
};

const DATE_PRESET_OPTIONS = [
    { value: "all", label: "All History" },
    { value: "today", label: "Today" },
    { value: "last7", label: "Last 7 Days" },
    { value: "last30", label: "Last 30 Days" },
    { value: "custom", label: "Custom Range" },
];

const DEFAULT_FILTERS = {
    status: "",
    datePreset: "all",
    fromDate: "",
    toDate: "",
    teacherId: "",
    page: 0,
    pageSize: 25
};

const ProxyManagementPage = () => {
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isFreePeriodModalOpen, setIsFreePeriodOpen] = useState(false);

    const queryFilters = useMemo(() => {
        const payload = {
            page: filters.page,
            pageSize: filters.pageSize
        };

        if (filters.status) payload.status = filters.status;
        if (filters.teacherId) payload.teacherId = filters.teacherId;
        if (filters.datePreset) payload.datePreset = filters.datePreset;
        if (filters.datePreset === "custom") {
            if (filters.fromDate) payload.fromDate = filters.fromDate;
            if (filters.toDate) payload.toDate = filters.toDate;
        }

        return payload;
    }, [filters]);

    const { data, isLoading, error } = useProxyRequests(queryFilters);
    const teachersQuery = useTeachers(true);
    const markFree = useMarkAsFreePeriod();

    const requests = data?.data?.requests || [];
    const pagination = data?.data?.pagination || {};
    const stats = data?.data?.stats || {
        pendingCount: 0,
        assignedProxyCount: 0,
        freePeriodCount: 0
    };
    const teachers = teachersQuery.data?.data?.users || [];

    const handleStatusChange = (status) => {
        setFilters((prev) => ({ ...prev, status: status === "all" ? "" : status, page: 0 }));
    };

    const handleTeacherChange = (teacherId) => {
        setFilters((prev) => ({ ...prev, teacherId: teacherId === "all" ? "" : teacherId, page: 0 }));
    };

    const handleDatePresetChange = (preset) => {
        setFilters((prev) => ({
            ...prev,
            datePreset: preset,
            fromDate: preset === "custom" ? prev.fromDate : "",
            toDate: preset === "custom" ? prev.toDate : "",
            page: 0
        }));
    };

    const handleCustomFromDate = (value) => {
        setFilters((prev) => ({ ...prev, fromDate: value, page: 0 }));
    };

    const handleCustomToDate = (value) => {
        setFilters((prev) => ({ ...prev, toDate: value, page: 0 }));
    };

    const handleAssignProxy = (request) => {
        setSelectedRequest(request);
        setIsAssignModalOpen(true);
    };

    const handleMarkFreePeriod = (request) => {
        setSelectedRequest(request);
        setIsFreePeriodOpen(true);
    };

    const confirmFreePeriod = async () => {
        if (!selectedRequest) return;

        try {
            await markFree.mutateAsync({
                requestId: selectedRequest._id,
                data: {}
            });
            setIsFreePeriodOpen(false);
            setSelectedRequest(null);
        } catch (err) {
            console.error("Failed to mark free period:", err);
        }
    };

    const hasActiveFilters = Boolean(
        filters.status ||
        filters.teacherId ||
        filters.datePreset !== "all" ||
        filters.fromDate ||
        filters.toDate
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <FaCalendarAlt className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Proxy Management</h1>
                        <p className="text-sm text-gray-500">Manage teacher substitutions and free periods</p>
                    </div>
                </div>
            </div>

            <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <FaFilter className="text-gray-400" size={16} />
                        <span className="text-sm font-medium text-gray-700">Filters:</span>
                    </div>

                    <Select value={filters.status || "all"} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-44 h-10">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.datePreset} onValueChange={handleDatePresetChange}>
                        <SelectTrigger className="w-48 h-10">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                            {DATE_PRESET_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.teacherId || "all"} onValueChange={handleTeacherChange}>
                        <SelectTrigger className="w-52 h-10">
                            <SelectValue placeholder="All Teachers" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Teachers</SelectItem>
                            {teachers.map((teacher) => (
                                <SelectItem key={teacher._id} value={teacher._id}>
                                    {teacher.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {filters.datePreset === "custom" && (
                        <>
                            <input
                                type="date"
                                value={filters.fromDate}
                                onChange={(e) => handleCustomFromDate(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                aria-label="From date"
                            />
                            <input
                                type="date"
                                value={filters.toDate}
                                onChange={(e) => handleCustomToDate(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                aria-label="To date"
                            />
                        </>
                    )}

                    {hasActiveFilters && (
                        <button
                            onClick={() => setFilters(DEFAULT_FILTERS)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <FaUserClock className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-900">{stats.pendingCount || 0}</p>
                            <p className="text-xs text-amber-700 font-medium">Pending Requests</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <FaUserCheck className="text-green-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-900">{stats.assignedProxyCount || 0}</p>
                            <p className="text-xs text-green-700 font-medium">Proxy Assignments</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                            <FaTimes className="text-gray-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.freePeriodCount || 0}</p>
                            <p className="text-xs text-gray-700 font-medium">Free Periods</p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                    Failed to load proxy requests. Please try again.
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Original Teacher</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Class</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                            Loading...
                                        </div>
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No proxy requests found.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((request) => {
                                    const StatusIcon = STATUS_ICONS[request.status];
                                    return (
                                        <tr key={request._id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatDate(request.date)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {request.dayOfWeek} - Period {request.slotNumber}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {request.timeSlotId?.startTime} - {request.timeSlotId?.endTime}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {request.teacherId?.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {request.teacherId?.email}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {request.standard}-{request.section}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {request.subject || "No subject"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[request.status]}`}>
                                                    <StatusIcon size={12} />
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                                    {request.reason?.trim() ? request.reason : "Not Provided"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {request.status === "pending" && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleAssignProxy(request)}
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                                                        >
                                                            Assign Proxy
                                                        </button>
                                                        <button
                                                            onClick={() => handleMarkFreePeriod(request)}
                                                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                                                        >
                                                            Free Period
                                                        </button>
                                                    </div>
                                                )}
                                                {request.status === "resolved" && (
                                                    <div className="text-xs text-gray-500">
                                                        {request.proxyAssignmentId?.type === "proxy" ? (
                                                            <span className="flex items-center gap-1 text-green-600">
                                                                <FaCheck size={12} />
                                                                Proxy: {request.proxyAssignmentId?.proxyTeacherId?.name || "Assigned"}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-gray-600">
                                                                <FaTimes size={12} />
                                                                Free Period
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <button
                            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                            disabled={filters.page === 0}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {filters.page + 1} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                            disabled={filters.page >= pagination.totalPages - 1}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            <ProxyAssignModal
                isOpen={isAssignModalOpen}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setSelectedRequest(null);
                }}
                request={selectedRequest}
            />

            {isFreePeriodModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Mark as Free Period?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                This will mark the class as a free period for this time slot.
                                Students will be notified that no teacher is assigned.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setIsFreePeriodOpen(false);
                                        setSelectedRequest(null);
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmFreePeriod}
                                    disabled={markFree.isPending}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all font-medium text-sm disabled:opacity-70"
                                >
                                    {markFree.isPending ? "Processing..." : "Confirm Free Period"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProxyManagementPage;
