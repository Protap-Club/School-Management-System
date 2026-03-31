import api from '../../../lib/axios';

const RESULT_BASE_URL = '/results';

const ensureSuccess = (response, fallbackMessage = 'Request failed') => {
  const data = response?.data;
  if (!data || data.success === false) {
    const error = new Error(data?.message || fallbackMessage);
    error.response = response;
    throw error;
  }
  return data;
};

export const resultApi = {
  getCompletedExams: async (filters = {}) => {
    const response = await api.get(`${RESULT_BASE_URL}/exams/completed`, { params: filters });
    return ensureSuccess(response, 'Failed to load completed exams');
  },

  getExamStudents: async (examId) => {
    const response = await api.get(`${RESULT_BASE_URL}/${examId}/students`);
    return ensureSuccess(response, 'Failed to load exam students');
  },

  saveResult: async (payload) => {
    const response = await api.post(RESULT_BASE_URL, payload);
    return ensureSuccess(response, 'Failed to save result');
  },

  getExamResults: async (examId) => {
    const response = await api.get(`${RESULT_BASE_URL}/${examId}`);
    return ensureSuccess(response, 'Failed to load exam results');
  },

  publishExamResults: async (examId) => {
    const response = await api.post(`${RESULT_BASE_URL}/${examId}/publish`);
    return ensureSuccess(response, 'Failed to publish results');
  },

  getMyResults: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.examId) params.append('examId', filters.examId);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`${RESULT_BASE_URL}/student/me${suffix}`);
    return ensureSuccess(response, 'Failed to load results');
  },
};

export default resultApi;
