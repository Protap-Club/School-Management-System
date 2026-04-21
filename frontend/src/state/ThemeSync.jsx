import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket } from '@/api/socket';
import { useAuth } from '@/features/auth';
import { settingsKeys } from '@/features/settings/api/queries';
import { useTheme, themeKeys } from '@/state/hooks';
import {
    BRANDING_BROADCAST_STORAGE_KEY,
} from '@/state/themeSlice';

const mergeSchoolIntoQuery = (prev, school) => ({
    ...(prev || {}),
    success: true,
    data: {
        ...(prev?.data || {}),
        school: {
            ...(prev?.data?.school || {}),
            ...school,
            theme: {
                ...(prev?.data?.school?.theme || {}),
                ...(school.theme || {}),
            },
        },
    },
});

const ThemeSync = () => {
    const queryClient = useQueryClient();
    const { user, accessToken } = useAuth();
    const { applyBrandingSnapshot, fetchBranding } = useTheme();

    const schoolId = user?.schoolId?._id || user?.schoolId || null;

    useEffect(() => {
        if (!schoolId || !accessToken) return undefined;

        const socket = connectSocket(schoolId);
        const handleBrandingChanged = (payload) => {
            const school = payload?.school || payload?.branding || payload;
            if (!school) {
                fetchBranding();
                queryClient.invalidateQueries({ queryKey: themeKeys.branding() });
                queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
                return;
            }

            applyBrandingSnapshot(school);
            queryClient.setQueryData(themeKeys.branding(), { success: true, data: { school } });
            queryClient.setQueryData(settingsKeys.profile(), (prev) => mergeSchoolIntoQuery(prev, school));
            window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { school } }));
        };

        socket.on('school:branding:changed', handleBrandingChanged);
        socket.on('school:theme:changed', handleBrandingChanged);

        return () => {
            socket.off('school:branding:changed', handleBrandingChanged);
            socket.off('school:theme:changed', handleBrandingChanged);
        };
    }, [accessToken, applyBrandingSnapshot, fetchBranding, queryClient, schoolId]);

    useEffect(() => {
        const handleStorage = (event) => {
            if (event.key === BRANDING_BROADCAST_STORAGE_KEY && event.newValue) {
                try {
                    const parsed = JSON.parse(event.newValue);
                    const school = parsed?.school;
                    if (!school) return;
                    const incomingSchoolId = school.schoolId || school._id || null;
                    if (schoolId && incomingSchoolId && String(incomingSchoolId) !== String(schoolId)) return;

                    applyBrandingSnapshot(school);
                    queryClient.setQueryData(themeKeys.branding(), { success: true, data: { school } });
                    queryClient.setQueryData(settingsKeys.profile(), (prev) => mergeSchoolIntoQuery(prev, school));
                } catch {
                    // Ignore malformed cross-tab storage payloads.
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [applyBrandingSnapshot, queryClient, schoolId]);

    return null;
};

export default ThemeSync;
