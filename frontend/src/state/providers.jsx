// Centralized Providers (Redux + Query)
import React from 'react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store } from './store';
import { queryClient } from '../lib/query-client';

// This wraps OUTSIDE of Router since App.jsx already has Router
export const AppProviders = ({ children }) => {
    return (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                {children}
                {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </QueryClientProvider>
        </Provider>
    );
};

export default AppProviders;
