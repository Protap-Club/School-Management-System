// Redux Store Configuration
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth';
import uiReducer from './uiSlice';
import themeReducer from './themeSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        ui: uiReducer,
        theme: themeReducer,
    },
    devTools: import.meta.env.DEV,
});
