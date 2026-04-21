import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Garbage collection time - 10 minutes (formerly cacheTime)
            gcTime: 10 * 60 * 1000,
            // Don't retry auth/rate-limit failures because retries amplify request storms.
            retry: (failureCount, error) => {
                const status = error?.response?.status;
                if (status === 401 || status === 429) {
                    return false;
                }
                return failureCount < 1;
            },
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // Disable global polling; enable per-query only where truly needed.
            refetchInterval: false,
            refetchIntervalInBackground: false,
        },
        mutations: {
            // Don't retry mutations
            retry: 0,
        },
    },
});
