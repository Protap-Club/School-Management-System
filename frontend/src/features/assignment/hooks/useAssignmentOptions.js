import { useMemo, useCallback } from 'react';
import { useAssignmentMetadata } from '../api/queries';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';

const normalizeSection = (value) => String(value || '').trim().toUpperCase();

export const useAssignmentOptions = (user = null) => {
    const { data, isLoading: metadataLoading } = useAssignmentMetadata();
    const {
        availableStandards: allStandards,
        allUniqueSections,
        getSectionsForStandard: getAllSectionsForStandard,
        classSections,
        loading: classesLoading,
    } = useSchoolClasses();

    const subjects = useMemo(() => data?.subjects || [], [data]);
    const mappings = useMemo(() => data?.mappings || {}, [data]);
    const validClassKeySet = useMemo(
        () => new Set(classSections.map((item) => `${item.standard}-${item.section}`)),
        [classSections]
    );

    // Check if user is a teacher
    const isTeacher = user?.role === 'teacher';
    const teacherProfile = user?.profile;
    const assignedClasses = teacherProfile?.assignedClasses || [];
    const teacherScopedStandards = useMemo(
        () => (isTeacher ? (data?.standards || []) : []),
        [isTeacher, data?.standards]
    );

    // Filtered standards based on role
    const availableStandards = useMemo(() => {
        if (isTeacher) {
            // Teacher metadata is already backend-scoped to classes/subjects they teach.
            return teacherScopedStandards;
        }
        return allStandards;
    }, [isTeacher, allStandards, teacherScopedStandards]);

    // Get sections for a specific standard that the teacher teaches
    const getTeacherSectionsForStandard = useCallback((standard) => {
        if (!standard) return [];
        return [...(mappings.classSections?.[standard] || [])]
            .map((section) => normalizeSection(section))
            .sort((a, b) => a.localeCompare(b));
    }, [mappings.classSections]);

    // Get all subjects the teacher teaches across all assigned classes
    const teacherSubjects = useMemo(() => {
        if (!isTeacher) return [];
        const subjectsSet = new Set();
        Object.values(mappings.sectionSubjects || {}).forEach((subjectList) => {
            (Array.isArray(subjectList) ? subjectList : []).forEach((subject) => {
                if (subject) subjectsSet.add(String(subject).trim());
            });
        });
        return Array.from(subjectsSet);
    }, [isTeacher, mappings.sectionSubjects]);

    // Get subjects for specific class-section combinations that teacher teaches
    const getTeacherSubjectsForClassSections = useCallback((standard, sections = []) => {
        if (!standard || !isTeacher) return [];

        const normalizedSections = Array.from(
            new Set(
                (Array.isArray(sections) ? sections : [sections])
                    .map((section) => normalizeSection(section))
                    .filter(Boolean)
            )
        );

        const sectionsToCheck = normalizedSections.length > 0
            ? normalizedSections
            : getTeacherSectionsForStandard(standard);

        const subjectsForClassSections = new Set();
        sectionsToCheck.forEach((section) => {
            const key = `${standard}-${section}`;
            (mappings.sectionSubjects?.[key] || []).forEach((subject) => {
                if (subject) subjectsForClassSections.add(String(subject).trim());
            });
        });

        return Array.from(subjectsForClassSections);
    }, [isTeacher, getTeacherSectionsForStandard, mappings.sectionSubjects]);

    // Check if teacher only teaches one subject (to make it uneditable)
    const hasSingleSubject = useMemo(() => {
        return isTeacher && teacherSubjects.length === 1;
    }, [isTeacher, teacherSubjects]);

    const singleSubject = useMemo(() => {
        return hasSingleSubject ? teacherSubjects[0] : null;
    }, [hasSingleSubject, teacherSubjects]);

    // Get sections based on role
    const getSectionsForStandard = useCallback((standard) => {
        if (isTeacher) {
            return getTeacherSectionsForStandard(standard);
        }
        return getAllSectionsForStandard(standard);
    }, [isTeacher, getTeacherSectionsForStandard, getAllSectionsForStandard]);

    // Get subjects for sections based on role
    const getSubjectsForSections = useCallback((standard, sections = []) => {
        if (isTeacher) {
            return getTeacherSubjectsForClassSections(standard, sections);
        }

        // Admin/SuperAdmin flow - use existing logic
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
            const standardSections = getAllSectionsForStandard(standard);
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
    }, [isTeacher, getTeacherSubjectsForClassSections, subjects, getAllSectionsForStandard, validClassKeySet, mappings.sectionSubjects]);

    const getAssignmentSectionsForStandard = useCallback((standard) => {
        if (!standard || standard === 'all') return allUniqueSections;
        return getSectionsForStandard(standard);
    }, [allUniqueSections, getSectionsForStandard]);

    return {
        loading: metadataLoading || classesLoading,
        availableStandards,
        getSectionsForStandard: getAssignmentSectionsForStandard,
        getSubjectsForSections,
        // Teacher-specific helpers
        isTeacher,
        teacherSubjects,
        hasSingleSubject,
        singleSubject,
        assignedClasses,
    };
};
