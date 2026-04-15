import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examApi } from './api';
import { useSelector } from 'react-redux';
import { selectAccessToken } from '../../auth/authSlice';

// ── Query Keys ─────────────────────────────────────────────────────

export const EXAM_QUERY_KEYS = {
  all: ['exams'],
  lists: () => [...EXAM_QUERY_KEYS.all, 'list'],
  list: (filters) => [...EXAM_QUERY_KEYS.lists(), filters],
  details: () => [...EXAM_QUERY_KEYS.all, 'detail'],
  detail: (id) => [...EXAM_QUERY_KEYS.details(), id],
  myExams: () => [...EXAM_QUERY_KEYS.all, 'myExams'],
  myExamsList: (filters) => [...EXAM_QUERY_KEYS.myExams(), filters],
};

const useProtectedQueryEnabled = (enabled = true) => {
  const accessToken = useSelector(selectAccessToken);
  return Boolean(accessToken) && enabled;
};

// ── Custom Hooks ───────────────────────────────────────────────────

// Get exams list (filtered by role)
// Normalizes API response to handle server-side pagination
export const useExams = (filters = {}) => {
  const enabled = useProtectedQueryEnabled();
  return useQuery({
    queryKey: EXAM_QUERY_KEYS.list(filters),
    queryFn: () => examApi.getExams(filters),
    enabled,
    select: (response) => {
      // Handle the new paginated shape `{ exams, pagination }` while maintaining backward compatibility
      if (response?.data?.exams || response?.data?.pagination) {
        return {
          exams: response.data.exams || [],
          pagination: response.data.pagination || { page: 0, pageSize: 25, totalCount: 0, totalPages: 0 },
          summary: response.data.summary || { total: 0, upcoming: 0, completed: 0, drafts: 0 },
        };
      }
      // Fallback for any endpoints returning an array
      return {
        exams: Array.isArray(response?.data) ? response.data : [],
        pagination: null,
        summary: null,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single exam by ID
// Returns a normalized exam object (or null)
export const useExam = (examId) => {
  const enabled = useProtectedQueryEnabled(!!examId);
  return useQuery({
    queryKey: EXAM_QUERY_KEYS.detail(examId),
    queryFn: () => examApi.getExamById(examId),
    select: (response) => response?.data || null,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get student's exams
// Normalizes to { termExams: [], classTests: [] }
export const useMyExams = (filters = {}) => {
  const enabled = useProtectedQueryEnabled();
  return useQuery({
    queryKey: EXAM_QUERY_KEYS.myExamsList(filters),
    queryFn: () => examApi.getMyExams(filters),
    enabled,
    select: (response) => response?.data || { termExams: [], classTests: [] },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create exam mutation
export const useCreateExam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (examData) => examApi.createExam(examData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.lists() });
    },
  });
};

// Update exam mutation
export const useUpdateExam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ examId, updateData }) => examApi.updateExam(examId, updateData),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.detail(examId) });
    },
  });
};

export const useUploadScheduleAttachments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, scheduleItemId, files }) =>
      examApi.uploadScheduleAttachments(examId, scheduleItemId, files),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.detail(examId) });
    },
  });
};

export const usePatchScheduleSyllabus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, scheduleItemId, updateData }) =>
      examApi.patchScheduleSyllabus(examId, scheduleItemId, updateData),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.detail(examId) });
    },
  });
};

// Delete exam mutation
export const useDeleteExam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (examId) => examApi.deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.lists() });
    },
  });
};

// Update exam status mutation
export const useUpdateExamStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ examId, status }) => examApi.updateStatus(examId, status),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.detail(examId) });
    },
  });
};
