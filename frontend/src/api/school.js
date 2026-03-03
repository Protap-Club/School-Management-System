import axios from './axios';

export const getSchoolClasses = async () => {
    try {
        const response = await axios.get('/school/classes');
        return response.data;
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to fetch school classes'
        };
    }
};
