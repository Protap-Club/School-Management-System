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

    const getSubjectsForSections = useCallback((standard, sections = []) => {
        if (!standard || standard === 'all') {
            return subjects;
        }

        const normalizedSections = Array.from(
            new Set(
                (Array.isArray(sections) ? sections : [sections])
                    .map((section) => String(section || '').trim().toUpperCase())
                    .filter(Boolean)
            )
        );

        if (normalizedSections.length === 0) {
            const standardSections = getAssignmentSectionsForStandard(standard);
            const unionSubjects = new Set();

            standardSections.forEach((section) => {
                const key = `${standard}-${section}`;
                if (!validClassKeySet.has(key)) return;
                (mappings.sectionSubjects?.[key] || []).forEach((subject) => unionSubjects.add(subject));
            });

            return [...unionSubjects];
        }

        const subjectLists = normalizedSections.map((section) => {
            const key = `${standard}-${section}`;
            if (!validClassKeySet.has(key)) {
                return [];
            }

            return mappings.sectionSubjects?.[key] || [];
        });

        if (subjectLists.some((list) => list.length === 0)) {
            return [];
        }

        return subjectLists.reduce((sharedSubjects, currentList, index) => {
            if (index === 0) {
                return [...currentList];
            }

            return sharedSubjects.filter((subject) => currentList.includes(subject));
        }, []);
    }, [getAssignmentSectionsForStandard, mappings.sectionSubjects, subjects, validClassKeySet]);

    return {
        loading: metadataLoading || classesLoading,
        availableStandards,
        getSectionsForStandard: getAssignmentSectionsForStandard,
        getSubjectsForSections,
    };
};
