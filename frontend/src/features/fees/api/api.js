// Fees API Functions
import api from '../../../lib/axios';

export const feesApi = {
    // ── Fee Structure CRUD ────────────────────────────────────────

    createFeeStructure: async (data) => {
        const response = await api.post('/fees/structures', data);
        return response.data;
    },

    getFeeStructures: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.academicYear) params.append('academicYear', filters.academicYear);
        if (filters.standard) params.append('standard', filters.standard);
        if (filters.section) params.append('section', filters.section);
        if (filters.feeType) params.append('feeType', filters.feeType);
        if (filters.isActive !== undefined && filters.isActive !== '') params.append('isActive', filters.isActive);
        const response = await api.get(`/fees/structures?${params.toString()}`);
        return response.data;
    },

    updateFeeStructure: async ({ id, data }) => {
        const response = await api.put(`/fees/structures/${id}`, data);
        return response.data;
    },

    deleteFeeStructure: async (id) => {
        const response = await api.delete(`/fees/structures/${id}`);
        return response.data;
    },

    // ── Assignment Generation & Management ────────────────────────

    generateAssignments: async ({ structureId, month, year }) => {
        const response = await api.post(`/fees/structures/${structureId}/generate`, { month, year });
        return response.data;
    },

    updateAssignment: async ({ id, data }) => {
        const response = await api.patch(`/fees/assignments/${id}`, data);
        return response.data;
    },

    // ── Payment Recording ─────────────────────────────────────────

    recordPayment: async ({ assignmentId, data }) => {
        const response = await api.post(`/fees/assignments/${assignmentId}/pay`, data);
        return response.data;
    },

    // ── Dashboard & Reports ───────────────────────────────────────

    getAllClassesOverview: async ({ academicYear, month }) => {
        const response = await api.get(`/fees/overview/all-classes?academicYear=${academicYear}&month=${month}`);
        return response.data;
    },

    getClassOverview: async ({ standard, section, academicYear, month }) => {
        const response = await api.get(`/fees/overview/${standard}/${section}?academicYear=${academicYear}&month=${month}`);
        return response.data;
    },

    getYearlySummary: async ({ academicYear }) => {
        const response = await api.get(`/fees/summary/yearly?academicYear=${academicYear}`);
        return response.data;
    },

    // ── Teacher Specific ──────────────────────────────────────────

    getMyClassFees: async ({ academicYear, month }) => {
        const response = await api.get(`/fees/my-classes?academicYear=${academicYear}&month=${month}`);
        return response.data;
    },

    // ── Student Specific ──────────────────────────────────────────
    getMyFees: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.academicYear) params.append('academicYear', filters.academicYear);
        if (filters.month) params.append('month', filters.month);
        const response = await api.get(`/fees/my-fees?${params.toString()}`);
        return response.data;
    },

    // ── Student Fee History ───────────────────────────────────────

    getStudentFeeHistory: async ({ studentId, academicYear }) => {
        const params = new URLSearchParams();
        if (academicYear) params.append('academicYear', academicYear);
        const response = await api.get(`/fees/student/${studentId}/history?${params.toString()}`);
        return response.data;
    },

    // ── Fee Type Management ───────────────────────────────────────

    getFeeTypes: async () => {
        const response = await api.get('/fees/types');
        return response.data;
    },

    createFeeType: async (data) => {
        const response = await api.post('/fees/types', data);
        return response.data;
    },
};
