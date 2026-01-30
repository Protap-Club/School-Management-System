//Redux Store Configuration
//Centralized store with all feature slices
import { configureStore } from '@reduxjs/toolkit';

// Import slices as they are created during migration
// import authReducer from '../features/auth/authSlice';
// import uiReducer from '../features/ui/uiSlice';
// import themeReducer from '../features/theme/themeSlice';

export const store = configureStore({
    reducer: {
        // Slices will be added during feature migration
        // auth: authReducer,
        // ui: uiReducer,
        // theme: themeReducer,
    },
    // Enable Redux DevTools in development
    devTools: import.meta.env.DEV,
});

// Export types for TypeScript (optional, for future migration)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
