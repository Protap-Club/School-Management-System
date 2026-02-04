// Settings TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from './api';

export const settingsKeys = {
    all: ['settings'],
    profile: () => [...settingsKeys.all, 'profile'],
};

// Get school profile (includes branding and features)
export const useSchoolProfile = () => {
    return useQuery({
        queryKey: settingsKeys.profile(),
        queryFn: settingsApi.getSchoolProfile,
    });
};

// Update school profile
export const useUpdateSchoolProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.updateSchoolProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
            window.dispatchEvent(new Event('settingsUpdated'));
        },
    });
};

// Upload logo
export const useUploadLogo = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.uploadLogo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
            window.dispatchEvent(new Event('settingsUpdated'));
        },
    });
};

// Update school features (admin only)
export const useUpdateSchoolFeatures = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.updateSchoolFeatures,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
        },
    });
};
