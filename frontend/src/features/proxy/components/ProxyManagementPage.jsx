import React, { useState, useMemo } from "react";
import { 
    FaCalendarAlt, 
    FaUserClock, 
    FaUserCheck, 
    FaUserTimes,
    FaFilter,
    FaSearch,
    FaCheck,
    FaTimes
} from "react-icons/fa";
import { formatDate } from "../../../utils";
import { 
    useProxyRequests, 
    useAvailableTeachers, 
    useAssignProxyTeacher,
    useMarkAsFreePeriod 
} from "../api/queries";
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

const ProxyManagementPage = () => {
    const [filters, setFilters] = useState({
        status: "pending",
        date: "",
        page: 0,
        pageSize: 25
    });

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isFreePeriodModalOpen, setIsFreePeriodOpen] = useState(false);

    const { data, isLoading, error } = useProxyRequests(filters);
    const assignProxy = useAssignProxyTeacher();
    const markFree = useMarkAsFreePeriod();

    const requests = data?.data?.requests || [];
    const pagination = data?.data?.pagination || {};

    const handleStatusChange = (status) => {
        setFilters(prev => ({ ...prev, status, page: 0 }));
    };

    const handleDateChange = (e) => {
        setFilters(prev => ({ ...prev, date: e.target.value, page: 0 }));
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

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
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

            {/* Filters */}
            <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <FaFilter className="text-gray-400" size={16} />
                        <span className="text-sm font-medium text-gray-700">Filters:</span>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <select
                            value={filters.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="resolved">Resolved</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filters.date}
                            onChange={handleDateChange}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>

                    {/* Clear Filters */}
                    {(filters.status || filters.date) && (
                        <button
                            onClick={() => setFilters({ status: "pending", date: "", page: 0, pageSize: 25 })}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <FaUserClock className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-900">
                                {data?.data?.stats?.pendingCount || requests.filter(r => r.status === "pending").length}
                            </p>
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
                            <p className="text-2xl font-bold text-green-900">
                                {requests.filter(r => r.status === "resolved" && r.proxyAssignmentId?.type === "proxy").length}
                            </p>
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
                            <p className="text-2xl font-bold text-gray-900">
                                {requests.filter(r => r.status === "resolved" && r.proxyAssignmentId?.type === "free_period").length}
                            </p>
                            <p className="text-xs text-gray-700 font-medium">Free Periods</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                    Failed to load proxy requests. Please try again.
                </div>
            )}

            {/* Requests Table */}
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
                                                    {request.dayOfWeek} • Period {request.slotNumber}
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
                                                    {request.reason || "-"}
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

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={filters.page === 0}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {filters.page + 1} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={filters.page >= pagination.totalPages - 1}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Assign Proxy Modal */}
            <ProxyAssignModal
                isOpen={isAssignModalOpen}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setSelectedRequest(null);
                }}
                request={selectedRequest}
            />

            {/* Free Period Confirmation Modal */}
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
