// Settings TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from './api';

export const settingsKeys = {
    all: ['settings'],
    branding: () => [...settingsKeys.all, 'branding'],
    features: (schoolId) => [...settingsKeys.all, 'features', schoolId],
};

// Get branding settings
export const useBranding = () => {
    return useQuery({
        queryKey: settingsKeys.branding(),
        queryFn: settingsApi.getBranding,
    });
};

// Update theme color
export const useUpdateTheme = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.updateTheme,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.branding() });
        },
    });
};

// Upload logo
export const useUploadLogo = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.uploadLogo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.branding() });
            window.dispatchEvent(new Event('settingsUpdated'));
        },
    });
};

// Get school features (super_admin)
export const useSchoolFeatures = (schoolId) => {
    return useQuery({
        queryKey: settingsKeys.features(schoolId),
        queryFn: () => settingsApi.getSchoolFeatures(schoolId),
        enabled: !!schoolId,
    });
};

// Toggle feature (super_admin)
export const useToggleFeature = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.toggleFeature,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.features(variables.schoolId) });
        },
    });
};
