// Compatibility Hooks - Bridge between old Context API and new Redux/Query
// These provide the same API as the old useXxx() hooks for gradual migration

import { useSelector, useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// ==== Sidebar Hook ====
import { selectSidebarCollapsed, toggleSidebar as toggleSidebarAction } from './uiSlice';

export const useSidebar = () => {
    const dispatch = useDispatch();
    const isCollapsed = useSelector(selectSidebarCollapsed);

    const toggleSidebar = () => {
        dispatch(toggleSidebarAction());
    };

    return { isCollapsed, toggleSidebar };
};

// ==== Theme Hook ====
import { selectBranding, selectAccentColor, setBranding, setAccentColor, applyThemeToDOM } from './themeSlice';
import { useBranding } from '../features/settings';
import { selectUser } from '../features/auth';

export const useTheme = () => {
    const dispatch = useDispatch();
    const branding = useSelector(selectBranding);
    const accentColor = useSelector(selectAccentColor);
    const user = useSelector(selectUser);

    // Fetch branding using TanStack Query when user exists
    const { data: brandingData, isLoading: loading, refetch: fetchBranding } = useBranding();

    // Sync TanStack Query data to Redux store
    useEffect(() => {
        if (brandingData?.data) {
            dispatch(setBranding(brandingData.data));
            if (brandingData.data.theme?.accentColor) {
                applyThemeToDOM(brandingData.data.theme.accentColor);
            }
        }
    }, [brandingData, dispatch]);

    // Listen for settings updates
    useEffect(() => {
        const handleSettingsUpdate = () => {
            if (user) {
                fetchBranding();
            }
        };
        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    }, [user, fetchBranding]);

    // Update theme (for immediate UI feedback)
    const updateTheme = (color) => {
        applyThemeToDOM(color);
        dispatch(setAccentColor(color));
    };

    return { branding, loading, updateTheme, fetchBranding };
};

// ==== Features Hook ====
import { useSchoolFeatures, featuresKeys } from './features';

export const useFeatures = () => {
    const queryClient = useQueryClient();
    const { data, isLoading: loading } = useSchoolFeatures();

    const features = data?.data?.features || {};

    const hasFeature = (featureKey) => {
        return features[featureKey] === true;
    };

    const refreshFeatures = () => {
        queryClient.invalidateQueries({ queryKey: featuresKeys.school() });
    };

    return { features, hasFeature, loading, refreshFeatures };
};
