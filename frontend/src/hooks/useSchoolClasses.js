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

    const classSectionsMap = useMemo(() => {
        const map = new Map();
        const pairs = Array.isArray(dataPayload.classSections) ? dataPayload.classSections : [];
        for (const pair of pairs) {
            const standard = String(pair?.standard || '').trim();
            const section = String(pair?.section || '').trim();
            if (!standard || !section) continue;
            if (!map.has(standard)) map.set(standard, new Set());
            map.get(standard).add(section);
        }
        return map;
    }, [dataPayload.classSections]);

    // Prefer exact sections configured for a standard. Fallback to global sections.
    const getSectionsForStandard = useCallback((standard) => {
        if (!standard) return allUniqueSections;
        const byStandard = classSectionsMap.get(String(standard).trim());
        if (byStandard && byStandard.size > 0) {
            return [...byStandard].sort((a, b) => a.localeCompare(b));
        }
        return allUniqueSections;
    }, [allUniqueSections, classSectionsMap]);

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
