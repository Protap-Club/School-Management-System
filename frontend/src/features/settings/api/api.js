// Settings API Functions
import api from '../../../lib/axios';

export const settingsApi = {
    // Get school branding (logo, theme)
    getBranding: async () => {
        const response = await api.get('/school/me/branding');
        return response.data;
    },

    // Update theme color
    updateTheme: async (accentColor) => {
        const response = await api.put('/school/theme', { accentColor });
        return response.data;
    },

    // Upload logo
    uploadLogo: async (file) => {
        const formData = new FormData();
        formData.append('logo', file);
        const response = await api.post('/school/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Get school features (super_admin)
    getSchoolFeatures: async (schoolId) => {
        const response = await api.get(`/school/${schoolId}/features`);
        return response.data;
    },

    // Toggle a feature (super_admin)
    toggleFeature: async ({ schoolId, featureKey, enabled }) => {
        const response = await api.patch(`/school/${schoolId}/features/${featureKey}`, { enabled });
        return response.data;
    },
};
