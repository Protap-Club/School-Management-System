import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Info, RefreshCw, Clock3 } from 'lucide-react';
import { AuditFilters } from './components/AuditFilters';
import { AuditLogTable } from './components/AuditLogTable';
import { useAuditLogs, useAllSchools } from './api/queries';
import { PaginationControls } from '@/components/ui/PaginationControls';
import DashboardLayout from '@/layouts/DashboardLayout';

export const AuditLogPage = () => {
    const [filters, setFilters] = useState({
        page: 0,
        limit: 25,
        search: '',
        actorRole: '',
        targetModel: '',
        startDate: '',
        endDate: '',
        // new structured filters
        action_type: '',
        severity: '',
        outcome: '',
        schoolId: '',
    });

    const { data: schoolsData } = useAllSchools();
    const schools = schoolsData?.data || [];

    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [flashGreen, setFlashGreen] = useState(false);

    const { data, isLoading, isError, refetch } = useAuditLogs({
        page: filters.page + 1, // API expects 1-indexed
        limit: filters.limit,
        search: filters.search,
        actorRole: filters.actorRole,
        targetModel: filters.targetModel,
        startDate: filters.startDate,
        endDate: filters.endDate,
        action_type: filters.action_type,
        severity: filters.severity,
        outcome: filters.outcome,
        schoolId: filters.schoolId,
    });

    const handlePageChange = (newPage) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    useEffect(() => {
        if (data && !lastRefreshed) {
            setLastRefreshed(new Date());
        }
    }, [data, lastRefreshed]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refetch();
            setLastRefreshed(new Date());
            setFlashGreen(true);
            setTimeout(() => setFlashGreen(false), 1500);
        } catch {
            // silent fail
        } finally {
            setIsRefreshing(false);
        }
    };

    const handlePageSizeChange = (newSize) => {
        setFilters(prev => ({ ...prev, limit: newSize, page: 0 }));
    };

    return (
        <DashboardLayout>
            <div className="w-full flex-col flex gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
                <div className="flex items-start gap-3 sm:gap-4 mb-2">
                    <div className="bg-white rounded-xl shadow-sm p-2 sm:p-3 border border-slate-100 text-violet-600 shrink-0">
                        <ShieldCheck size={28} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Audit Logs</h1>
                        <p className="text-sm text-slate-500 font-normal">
                            Comprehensive, immutable trail of critical system operations and data mutations.
                        </p>
                        {filters.schoolId ? (
                            <div className="mt-1 flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                <span>{schools.find(s => s._id === filters.schoolId)?.name || 'Loading...'}</span>
                                <button 
                                    onClick={() => setFilters(prev => ({ ...prev, schoolId: '', page: 0 }))}
                                    className="ml-1 text-indigo-400 hover:text-indigo-700 transition-colors"
                                    aria-label="Clear school filter"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 mt-1">
                                Showing logs across all schools
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Refresh Control Bar ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-400">
                            Audit logs are not live — refresh to see the latest activity.
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {lastRefreshed && (
                            <div className="flex items-center gap-1.5 transition-opacity duration-300">
                                <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                                <span className={`text-xs font-mono transition-colors duration-300 ${flashGreen ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    Logs shown till {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg shadow-sm transition-all duration-150 ${
                                isRefreshing 
                                ? 'opacity-60 cursor-not-allowed text-slate-600' 
                                : 'text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 hover:shadow-md'
                            }`}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                <AuditFilters filters={filters} setFilters={setFilters} schools={schools} />

                {isError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                        Failed to load audit logs. Please try again later.
                    </div>
                ) : (
                    <div className="flex flex-col rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                        <AuditLogTable logs={data?.data} isLoading={isLoading} />

                        <PaginationControls
                            currentPage={filters.page}
                            totalItems={data?.pagination?.total || 0}
                            itemsPerPage={filters.limit}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AuditLogPage;
