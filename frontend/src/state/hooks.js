// Compatibility Hooks - Bridge between old Context API and new Redux/Query
// These provide the same API as the old useXxx() hooks for gradual migration

import { useSelector, useDispatch } from 'react-redux';
import { useQueryClient, useQuery } from '@tanstack/react-query';
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
import { selectBranding, setBranding, setAccentColor, applyThemeToDOM } from './themeSlice';
import { selectIsAuthenticated } from '../features/auth';
import api from '../lib/axios';

// Theme query keys
const themeKeys = {
    branding: () => ['branding'],
};

export const useTheme = () => {
    const dispatch = useDispatch();
    const branding = useSelector(selectBranding);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    // Fetch branding using TanStack Query
    const { data: brandingData, isLoading: loading, refetch: fetchBranding } = useQuery({
        queryKey: themeKeys.branding(),
        queryFn: async () => {
            const response = await api.get('/school');
            return response.data;
        },
        enabled: isAuthenticated,
        staleTime: 5 * 60 * 1000,
    });

    // Sync TanStack Query data to Redux store
    useEffect(() => {
        if (brandingData?.data) {
            const schoolData = brandingData.data.school || brandingData.data;
            const apiColor = schoolData.theme?.accentColor;

            // Centralize branding data in Redux
            dispatch(setBranding(brandingData.data));

            // Only apply theme from DOM if we don't have a local preference yet
            // or if we're initializing and want to ensure the latest school brand is set.
            // Note: updateTheme locally updates localStorage immediately.
            if (apiColor && !localStorage.getItem('school-accent-color')) {
                applyThemeToDOM(apiColor);
                dispatch(setAccentColor(apiColor));
            }
        }
    }, [brandingData, dispatch]);

    // Listen for settings updates
    useEffect(() => {
        const handleSettingsUpdate = () => {
            if (isAuthenticated) {
                fetchBranding();
            }
        };
        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    }, [isAuthenticated, fetchBranding]);

    // Update theme (for immediate UI feedback)
    const updateTheme = (color) => {
        applyThemeToDOM(color);
        dispatch(setAccentColor(color));
    };

    return { branding, loading, updateTheme, fetchBranding };
};

// ==== Features Hook ====
// Features query keys
const featuresKeys = {
    all: ['features'],
    school: () => [...featuresKeys.all, 'school'],
};

export const useFeatures = () => {
    const queryClient = useQueryClient();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const { data, isLoading: loading } = useQuery({
        queryKey: featuresKeys.school(),
        queryFn: async () => {
            const response = await api.get('/school');
            return response.data;
        },
        enabled: isAuthenticated,
        staleTime: 5 * 60 * 1000,
    });

    const features = data?.data?.school?.features || data?.data?.features || {};

    const hasFeature = (featureKey) => {
        return features[featureKey] === true;
    };

    const refreshFeatures = () => {
        queryClient.invalidateQueries({ queryKey: featuresKeys.school() });
    };

    return { features, hasFeature, loading, refreshFeatures };
};
