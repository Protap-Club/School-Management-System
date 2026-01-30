// Redux Store Configuration
import { configureStore } from '@reduxjs/toolkit';

// Slices will be imported here as features are migrated
// import authReducer from '../features/auth/authSlice';

export const store = configureStore({
    reducer: {
        // auth: authReducer,
    },
    devTools: import.meta.env.DEV,
});
