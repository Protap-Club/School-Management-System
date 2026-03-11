import api from '../../../api/axios';

// Base URL for examination endpoints
const EXAM_BASE_URL = '/examination';

// ── Exam CRUD Operations ─────────────────────────────────────

export const examApi = {
  // Create exam (admin: TERM_EXAM, teacher: CLASS_TEST)
  createExam: async (examData) => {
    const response = await api.post(EXAM_BASE_URL, examData);
    return response.data;
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
    return response.data;
  },

  // Get exam by ID
  getExamById: async (examId) => {
    const response = await api.get(`${EXAM_BASE_URL}/${examId}`);
    return response.data;
  },

  // Update exam
  updateExam: async (examId, updateData) => {
    const response = await api.put(`${EXAM_BASE_URL}/${examId}`, updateData);
    return response.data;
  },

  // Delete exam (soft delete, DRAFT status only)
  deleteExam: async (examId) => {
    const response = await api.delete(`${EXAM_BASE_URL}/${examId}`);
    return response.data;
  },

  // Update exam status (DRAFT→PUBLISHED→COMPLETED/CANCELLED)
  updateStatus: async (examId, status) => {
    const response = await api.patch(`${EXAM_BASE_URL}/${examId}/status`, { status });
    return response.data;
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
    return response.data;
  },
};

export default examApi;
