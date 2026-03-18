import api from '../../../api/axios';

// Base URL for examination endpoints
const EXAM_BASE_URL = '/examinations';

// Helper to ensure we only treat successful responses as success
const ensureSuccess = (response, fallbackMessage = 'Request failed') => {
  const data = response?.data;
  if (!data || data.success === false) {
    const message = data?.message || fallbackMessage;
    const error = new Error(message);
    // Attach original response for callers that inspect error.response
    error.response = response;
    throw error;
  }
  return data;
};

// ── Exam CRUD Operations ─────────────────────────────────────

export const examApi = {
  // Create exam (admin: TERM_EXAM, teacher: CLASS_TEST)
  createExam: async (examData) => {
    const response = await api.post(EXAM_BASE_URL, examData);
    return ensureSuccess(response, 'Failed to create exam');
  },

  // Get exams (filtered by role and query params)
  getExams: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    
    const response = await api.get(`${EXAM_BASE_URL}?${params}`);
    return ensureSuccess(response, 'Failed to load exams');
  },

  // Get exam by ID
  getExamById: async (examId) => {
    const response = await api.get(`${EXAM_BASE_URL}/${examId}`);
    return ensureSuccess(response, 'Failed to load exam');
  },

  // Update exam
  updateExam: async (examId, updateData) => {
    const response = await api.put(`${EXAM_BASE_URL}/${examId}`, updateData);
    return ensureSuccess(response, 'Failed to update exam');
  },

  // Delete exam (soft delete, DRAFT status only)
  deleteExam: async (examId) => {
    const response = await api.delete(`${EXAM_BASE_URL}/${examId}`);
    return ensureSuccess(response, 'Failed to delete exam');
  },

  // Update exam status (DRAFT→PUBLISHED→COMPLETED/CANCELLED)
  updateStatus: async (examId, status) => {
    const response = await api.patch(`${EXAM_BASE_URL}/${examId}/status`, { status });
    return ensureSuccess(response, 'Failed to update status');
  },

  // Student specific: Get my exams (term exams + class tests)
  getMyExams: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    
    const response = await api.get(`${EXAM_BASE_URL}/my-exams?${params}`);
    return ensureSuccess(response, 'Failed to load my exams');
  },
};

export default examApi;
