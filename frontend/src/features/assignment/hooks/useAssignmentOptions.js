import { useMemo, useCallback } from 'react';
import { useAssignmentMetadata } from '../api/queries';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';

export const useAssignmentOptions = () => {
    const { data, isLoading: metadataLoading } = useAssignmentMetadata();
    const {
        availableStandards,
        allUniqueSections,
        getSectionsForStandard,
        classSections,
        loading: classesLoading,
    } = useSchoolClasses();

    const subjects = useMemo(() => data?.subjects || [], [data]);
    const mappings = useMemo(() => data?.mappings || {}, [data]);
    const validClassKeySet = useMemo(
        () => new Set(classSections.map((item) => `${item.standard}-${item.section}`)),
        [classSections]
    );

    const getAssignmentSectionsForStandard = useCallback((standard) => {
        if (!standard || standard === 'all') return allUniqueSections;
        return getSectionsForStandard(standard);
    }, [allUniqueSections, getSectionsForStandard]);

    const getSubjectsForClass = useCallback((standard, section) => {
        if (!standard || !section || standard === 'all' || section === 'all') {
            return subjects;
        }
        const key = `${standard}-${section}`;
        if (!validClassKeySet.has(key)) {
            return [];
        }
        return mappings.sectionSubjects?.[key] || [];
    }, [mappings.sectionSubjects, subjects, validClassKeySet]);

    return {
        loading: metadataLoading || classesLoading,
        availableStandards,
        getSectionsForStandard: getAssignmentSectionsForStandard,
        getSubjectsForClass,
    };
};
