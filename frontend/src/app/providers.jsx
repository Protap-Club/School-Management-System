//Centralized Providers
//Wraps the application with all necessary providers (Redux, Query, Router)

import React from 'react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import { queryClient } from '../lib/query-client';

export const AppProviders = ({ children }) => {
    return (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    {children}
                </BrowserRouter>
                {/* React Query DevTools - only visible in development */}
                {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </QueryClientProvider>
        </Provider>
    );
};

export default AppProviders;
