// Redux Store Configuration
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth';

export const store = configureStore({
    reducer: {
        auth: authReducer,
    },
    devTools: import.meta.env.DEV,
});
