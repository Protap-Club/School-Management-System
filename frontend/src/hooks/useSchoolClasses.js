import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSchoolClasses } from '../api/school';

const SCHOOL_CLASSES_KEY = ['school', 'classes'];

export const useSchoolClasses = () => {
    const { data: responseData, isLoading: loading, error, refetch } = useQuery({
        queryKey: SCHOOL_CLASSES_KEY,
        queryFn: getSchoolClasses,
        staleTime: 5 * 60 * 1000, // 5 minutes cache
    });

    const dataPayload = responseData?.data || {};
    
    // Provide an empty array for backward compatibility if any component destructured it
    const classesData = [];

    // The backend provides distinct lists of standards and sections across the school
    const availableStandards = useMemo(() => {
        const stds = dataPayload.standards || [];
        return [...stds].sort((a, b) => {
            const numA = parseInt(a) || 0;
            const numB = parseInt(b) || 0;
            return numA - numB;
        });
    }, [dataPayload.standards]);

    const allUniqueSections = useMemo(() => {
        const secs = dataPayload.sections || [];
        return [...secs].sort((a, b) => a.localeCompare(b));
    }, [dataPayload.sections]);

    // Since the backend 'distinct' query provides global sections and not a map,
    // we return all configured sections across the school.
    const getSectionsForStandard = useCallback((standard) => {
        const secs = dataPayload.sections || [];
        return [...secs].sort((a, b) => a.localeCompare(b));
    }, [dataPayload.sections]);

    return {
        classesData,
        loading,
        error,
        availableStandards,
        getSectionsForStandard,
        allUniqueSections,
        refetch
    };
};
