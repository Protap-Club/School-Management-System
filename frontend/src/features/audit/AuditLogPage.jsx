import React, { useState } from 'react';
import { AuditFilters } from './components/AuditFilters';
import { AuditLogTable } from './components/AuditLogTable';
import { useAuditLogs } from './api/queries';
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
    });

    const { data, isLoading, isError } = useAuditLogs({
        page: filters.page + 1, // API usually expects 1-indexed for pagination
        limit: filters.limit,
        search: filters.search,
        actorRole: filters.actorRole,
        targetModel: filters.targetModel,
        startDate: filters.startDate,
        endDate: filters.endDate,
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
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Audit Logs</h1>
                    <p className="text-sm text-slate-500">
                        Comprehensive, immutable trail of critical system operations and data mutations.
                    </p>
                </div>

                <AuditFilters filters={filters} setFilters={setFilters} />

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
