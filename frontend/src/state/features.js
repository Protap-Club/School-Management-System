// Features API & Hooks - TanStack Query for school features
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';

// API function
export const fetchSchoolFeatures = async () => {
    const response = await api.get('/school/me/features');
    return response.data;
};

// Query keys
export const featuresKeys = {
    all: ['features'],
    school: () => [...featuresKeys.all, 'school'],
};

// Hook to get current school's features
export const useSchoolFeatures = (options = {}) => {
    return useQuery({
        queryKey: featuresKeys.school(),
        queryFn: fetchSchoolFeatures,
        ...options,
    });
};

// Helper hook to check if a feature is enabled
export const useHasFeature = (featureKey) => {
    const { data } = useSchoolFeatures();
    return data?.data?.features?.[featureKey] === true;
};
