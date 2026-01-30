//TanStack Query Client Configuration
//Centralized query client with default options for caching and retry behavior

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Garbage collection time - 10 minutes (formerly cacheTime)
            gcTime: 10 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
        },
        mutations: {
            // Don't retry mutations
            retry: 0,
        },
    },
});
