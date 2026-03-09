// Settings API Functions
import api from '../../../lib/axios';

export const settingsApi = {
    // Get school profile (includes branding, features)
    // GET /api/v1/school
    getSchoolProfile: async () => {
        const response = await api.get('/school');
        return response.data;
    },

    // Update school profile (includes theme)
    // PUT /api/v1/school
    updateSchoolProfile: async (data) => {
        const response = await api.put('/school', data);
        return response.data;
    },

    // Upload logo
    // POST /api/v1/school/logo
    uploadLogo: async (file) => {
        const formData = new FormData();
        formData.append('logo', file);
        const response = await api.post('/school/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Update school features (super_admin/admin only)
    // PATCH /api/v1/school/features
    updateSchoolFeatures: async (features) => {
        const response = await api.patch('/school/features', { features });
        return response.data;
    },
};
