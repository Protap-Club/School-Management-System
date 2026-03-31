import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';

export const useDashboardStats = () => {
    return useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
            const response = await api.get('/dashboard/stats');
            return response.data;
        },
        staleTime: 30 * 1000, // Data fresh for 30s to prevent rapid refetch on tab focus
        select: (response) => response?.data,
    });
};
