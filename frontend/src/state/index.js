// App Module - Public API
// Central exports for app-level state management

// Store
export { store } from './store';

// Providers
export { AppProviders } from './providers';

// Compatibility Hooks (same API as old Context)
export { useSidebar, useTheme, useFeatures } from './hooks';

// UI Slice
export {
    toggleSidebar,
    setSidebarCollapsed,
    selectSidebarCollapsed
} from './uiSlice';

// Theme Slice
export {
    setBranding,
    setAccentColor,
    selectBranding,
    selectAccentColor,
    selectLogoUrl,
    applyThemeToDOM
} from './themeSlice';

// Features (TanStack Query)
export { useSchoolFeatures, useHasFeature, featuresKeys } from './features';
