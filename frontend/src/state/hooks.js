// Compatibility Hooks - Bridge between old Context API and new Redux/Query
// These provide the same API as the old useXxx() hooks for gradual migration

import { useSelector, useDispatch } from 'react-redux';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

// ==== Sidebar Hook ====
import {
    selectSidebarCollapsed,
    selectMobileSidebarOpen,
    toggleSidebar as toggleSidebarAction,
    toggleMobileSidebar as toggleMobileSidebarAction,
    setMobileSidebarOpen as setMobileSidebarOpenAction,
} from './uiSlice';

export const useSidebar = () => {
    const dispatch = useDispatch();
    const isCollapsed = useSelector(selectSidebarCollapsed);
    const isMobileOpen = useSelector(selectMobileSidebarOpen);

    const toggleSidebar = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            dispatch(toggleMobileSidebarAction());
            return;
        }
        dispatch(toggleSidebarAction());
    };

    const toggleMobileSidebar = () => {
        dispatch(toggleMobileSidebarAction());
    };

    const setMobileSidebarOpen = (isOpen) => {
        dispatch(setMobileSidebarOpenAction(isOpen));
    };

    return { isCollapsed, isMobileOpen, toggleSidebar, toggleMobileSidebar, setMobileSidebarOpen };
};

// ==== Theme Hook ====
import { selectBranding, setBranding, setAccentColor, applyThemeToDOM, extractBrandingSchool, DEFAULT_ACCENT_COLOR } from './themeSlice';
import { selectAccessToken, selectIsAuthenticated } from '../features/auth';
import api from '../lib/axios';

// Theme query keys
export const themeKeys = {
    branding: () => ['branding'],
};

export const useTheme = () => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const branding = useSelector(selectBranding);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const accessToken = useSelector(selectAccessToken);

    const applyBrandingSnapshot = useCallback((payload) => {
        const schoolData = extractBrandingSchool(payload);
        if (!schoolData) return null;

        dispatch(setBranding(schoolData));
        applyThemeToDOM(schoolData.theme?.accentColor || DEFAULT_ACCENT_COLOR);

        return schoolData;
    }, [dispatch]);

    // Fetch branding using TanStack Query
    const { data: brandingData, isLoading: loading, refetch: fetchBranding } = useQuery({
        queryKey: themeKeys.branding(),
        queryFn: async () => {
            const response = await api.get('/school');
            return response.data;
        },
        enabled: isAuthenticated && Boolean(accessToken),
        staleTime: 5 * 60 * 1000,
    });

    // Sync TanStack Query data to Redux store
    useEffect(() => {
        if (brandingData?.data) {
            applyBrandingSnapshot(brandingData.data);
        }
    }, [applyBrandingSnapshot, brandingData]);

    // Listen for settings updates
    useEffect(() => {
        const handleSettingsUpdate = (event) => {
            const nextBranding = event?.detail?.school || event?.detail?.branding || event?.detail;
            if (nextBranding) {
                queryClient.setQueryData(themeKeys.branding(), { success: true, data: { school: nextBranding } });
                applyBrandingSnapshot(nextBranding);
                return;
            }

            if (isAuthenticated) {
                fetchBranding();
            }
        };
        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    }, [applyBrandingSnapshot, fetchBranding, isAuthenticated, queryClient]);

    // Update theme (for immediate UI feedback)
    const updateTheme = (color) => {
        applyThemeToDOM(color);
        dispatch(setAccentColor(color));
    };

    return { branding, loading, updateTheme, fetchBranding, applyBrandingSnapshot };
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
    const accessToken = useSelector(selectAccessToken);

    const { data, isLoading: loading } = useQuery({
        queryKey: featuresKeys.school(),
        queryFn: async () => {
            const response = await api.get('/school');
            return response.data;
        },
        enabled: isAuthenticated && Boolean(accessToken),
        staleTime: 5 * 60 * 1000,
    });

    const features = data?.data?.school?.features || data?.data?.features || {};

    const hasFeature = (featureKey) => {
        // While loading, optimistically return true so widgets aren't hidden on first paint.
        // Only return false when we have confirmed data saying the feature is off.
        if (loading) return true;
        return features[featureKey] === true;
    };

    const refreshFeatures = () => {
        queryClient.invalidateQueries({ queryKey: featuresKeys.school() });
    };

    return { features, hasFeature, loading, refreshFeatures };
};
