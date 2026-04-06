import { QueryClient, MutationCache } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    mutationCache: new MutationCache({
        onSuccess: () => {
            // Automatically invalidate all active queries after any successful mutation
            // This ensures all pages reflect updated data instantly
            queryClient.invalidateQueries();
        },
    }),
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
            // Background refetching every 30 seconds
            refetchInterval: 30 * 1000,
            // Keep current UI state (filters, pagination) during background refetch
            refetchIntervalInBackground: true,
        },
        mutations: {
            // Don't retry mutations
            retry: 0,
        },
    },
});
