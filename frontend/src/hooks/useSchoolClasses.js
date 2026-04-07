import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSchoolClasses } from '../api/school';
import { connectSocket } from '../api/socket';
import { useAuth } from '../features/auth';
import {
    normalizeClassSection,
    sortClassSections,
} from '../utils/classSection';

export const getSchoolClassesQueryKey = (schoolId) => ['school', schoolId || 'unknown', 'classes'];

const sortStrings = (items = []) =>
    [...items].sort((a, b) =>
        String(a || '').localeCompare(String(b || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
        })
    );

export const normalizeSchoolClassesPayload = (payload = {}) => {
    const normalizedPairs = sortClassSections(
        (Array.isArray(payload?.classSections) ? payload.classSections : [])
            .map((item) => normalizeClassSection(item))
            .filter((item) => item.standard && item.section)
    );

    const derivedStandards = [...new Set(normalizedPairs.map((item) => item.standard))];
    const derivedSections = [...new Set(normalizedPairs.map((item) => item.section))];

    return {
        ...payload,
        classSections: normalizedPairs,
        standards: sortStrings(
            (Array.isArray(payload?.standards) ? payload.standards : derivedStandards)
                .map((item) => String(item || '').trim())
                .filter(Boolean)
        ),
        sections: sortStrings(
            (Array.isArray(payload?.sections) ? payload.sections : derivedSections)
                .map((item) => String(item || '').trim().toUpperCase())
                .filter(Boolean)
        ),
        subjects: sortStrings(
            (Array.isArray(payload?.subjects) ? payload.subjects : [])
                .map((item) => String(item || '').trim())
                .filter(Boolean)
        ),
        rooms: sortStrings(
            (Array.isArray(payload?.rooms) ? payload.rooms : [])
                .map((item) => String(item || '').trim())
                .filter(Boolean)
        ),
    };
};

export const makeSchoolClassesQueryData = (payload = {}) => ({
    success: true,
    data: normalizeSchoolClassesPayload(payload),
});

export const useSchoolClasses = (options = {}) => {
    const { enabled = true } = options;
    const queryClient = useQueryClient();
    const { user, accessToken } = useAuth();
    const schoolId = user?.schoolId?._id || user?.schoolId;
    const queryKey = useMemo(() => getSchoolClassesQueryKey(schoolId), [schoolId]);

    const {
        data: responseData,
        isLoading: loading,
        error,
    } = useQuery({
        queryKey,
        queryFn: getSchoolClasses,
        staleTime: 5 * 60 * 1000,
        enabled: enabled && Boolean(schoolId) && !!accessToken,
    });

    const payload = useMemo(
        () => normalizeSchoolClassesPayload(responseData?.data || {}),
        [responseData?.data]
    );

    const applySnapshot = useCallback(
        (snapshot) => {
            if (!schoolId || !snapshot) return;

            queryClient.setQueryData(
                getSchoolClassesQueryKey(schoolId),
                makeSchoolClassesQueryData(snapshot)
            );
        },
        [queryClient, schoolId]
    );

    useEffect(() => {
        if (!schoolId) return undefined;

        const socket = connectSocket(schoolId);

        const handleClassSnapshot = (eventPayload) => {
            if (eventPayload?.schoolId && String(eventPayload.schoolId) !== String(schoolId)) {
                return;
            }

            if (Array.isArray(eventPayload?.classSections)) {
                applySnapshot(eventPayload);
                return;
            }

            queryClient.invalidateQueries({ queryKey: getSchoolClassesQueryKey(schoolId) });
        };

        socket.on('school:classes:changed', handleClassSnapshot);
        socket.on('class:created', handleClassSnapshot);
        socket.on('class:deleted', handleClassSnapshot);

        return () => {
            socket.off('school:classes:changed', handleClassSnapshot);
            socket.off('class:created', handleClassSnapshot);
            socket.off('class:deleted', handleClassSnapshot);
        };
    }, [applySnapshot, queryClient, schoolId]);

    useEffect(() => {
        if (!schoolId) return undefined;

        const handleCustomClassesUpdate = (event) => {
            if (Array.isArray(event?.detail?.classSections)) {
                applySnapshot(event.detail);
                return;
            }

            queryClient.invalidateQueries({ queryKey: getSchoolClassesQueryKey(schoolId) });
        };

        window.addEventListener('customClassesUpdated', handleCustomClassesUpdate);
        return () => {
            window.removeEventListener('customClassesUpdated', handleCustomClassesUpdate);
        };
    }, [applySnapshot, queryClient, schoolId]);

    const classSectionsMap = useMemo(() => {
        const map = new Map();

        for (const pair of payload.classSections) {
            if (!map.has(pair.standard)) {
                map.set(pair.standard, new Set());
            }
            map.get(pair.standard).add(pair.section);
        }

        return map;
    }, [payload.classSections]);

    const getSectionsForStandard = useCallback(
        (standard) => {
            const normalizedStandard = String(standard || '').trim();
            if (!normalizedStandard) return payload.sections;

            const byStandard = classSectionsMap.get(normalizedStandard);
            if (!byStandard || byStandard.size === 0) {
                return [];
            }

            return sortStrings([...byStandard]);
        },
        [classSectionsMap, payload.sections]
    );

    return {
        payload,
        classSections: payload.classSections,
        availableStandards: payload.standards,
        allUniqueSections: payload.sections,
        getSectionsForStandard,
        subjects: payload.subjects,
        rooms: payload.rooms,
        loading,
        error,
    };
};
