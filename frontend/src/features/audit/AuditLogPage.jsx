import React, { useState } from 'react';
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

    const { data, isLoading, isError } = useAuditLogs({
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

    const handlePageSizeChange = (newSize) => {
        setFilters(prev => ({ ...prev, limit: newSize, page: 0 }));
    };

    return (
        <DashboardLayout>
            <div className="w-full flex-col flex gap-6 p-6 max-w-7xl mx-auto">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Audit Logs</h1>
                        {filters.schoolId ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                                {schools.find(s => s._id === filters.schoolId)?.name || 'Loading...'}
                            </span>
                        ) : (
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                                Viewing All Schools
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500">
                        Comprehensive, immutable trail of critical system operations and data mutations.
                    </p>
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
