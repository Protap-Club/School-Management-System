import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examApi } from './api';

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

// ── Custom Hooks ───────────────────────────────────────────────────

// Get exams list (filtered by role)
export const useExams = (filters = {}) => {
  return useQuery({
    queryKey: EXAM_QUERY_KEYS.list(filters),
    queryFn: () => examApi.getExams(filters),
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single exam by ID
export const useExam = (examId) => {
  return useQuery({
    queryKey: EXAM_QUERY_KEYS.detail(examId),
    queryFn: () => examApi.getExamById(examId),
    select: (response) => response.data,
    enabled: !!examId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get student's exams
export const useMyExams = (filters = {}) => {
  return useQuery({
    queryKey: EXAM_QUERY_KEYS.myExamsList(filters),
    queryFn: () => examApi.getMyExams(filters),
    select: (response) => response.data,
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
