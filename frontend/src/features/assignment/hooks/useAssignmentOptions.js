import { useMemo, useCallback } from 'react';
import { useAssignmentMetadata } from '../api/queries';

export const useAssignmentOptions = () => {
    const { data, isLoading: loading, error, refetch } = useAssignmentMetadata();

    const standards = useMemo(() => data?.standards || [], [data]);
    const sections = useMemo(() => data?.sections || [], [data]);
    const subjects = useMemo(() => data?.subjects || [], [data]);
    const mappings = useMemo(() => data?.mappings || {}, [data]);

    const getSectionsForStandard = useCallback((standard) => {
        if (!standard || standard === 'all') return sections;
        return mappings.classSections?.[standard] || [];
    }, [mappings.classSections, sections]);

    const getSubjectsForClass = useCallback((standard, section) => {
        if (!standard || !section || standard === 'all' || section === 'all') {
            return subjects;
        }
        const key = `${standard}-${section}`;
        return mappings.sectionSubjects?.[key] || [];
    }, [mappings.sectionSubjects, subjects]);

    return {
        loading,
        error,
        availableStandards: standards,
        availableSections: sections,
        availableSubjects: subjects,
        getSectionsForStandard,
        getSubjectsForClass,
        refetch
    };
};
