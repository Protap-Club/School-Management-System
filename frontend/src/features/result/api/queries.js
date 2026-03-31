import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resultApi } from './api';

export const RESULT_QUERY_KEYS = {
  all: ['results'],
  completedExams: (filters = {}) => [...RESULT_QUERY_KEYS.all, 'completedExams', filters],
  examStudents: (examId) => [...RESULT_QUERY_KEYS.all, 'examStudents', examId],
  examResults: (examId) => [...RESULT_QUERY_KEYS.all, 'examResults', examId],
  myResults: (filters = {}) => [...RESULT_QUERY_KEYS.all, 'myResults', filters],
};

export const useCompletedResultExams = (filters = {}) => {
  return useQuery({
    queryKey: RESULT_QUERY_KEYS.completedExams(filters),
    queryFn: () => resultApi.getCompletedExams(filters),
    select: (response) => {
      if (response?.data?.exams || response?.data?.pagination) {
        return {
          exams: response.data.exams || [],
          pagination: response.data.pagination || { page: 0, pageSize: 25, totalCount: 0, totalPages: 0 }
        };
      }
      return { exams: Array.isArray(response?.data) ? response.data : [], pagination: null };
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useResultExamStudents = (examId) => {
  return useQuery({
    queryKey: RESULT_QUERY_KEYS.examStudents(examId),
    queryFn: () => resultApi.getExamStudents(examId),
    select: (response) => response?.data || null,
    enabled: !!examId,
  });
};

export const useResultExamResults = (examId) => {
  return useQuery({
    queryKey: RESULT_QUERY_KEYS.examResults(examId),
    queryFn: () => resultApi.getExamResults(examId),
    select: (response) => response?.data || null,
    enabled: !!examId,
  });
};

export const useSaveResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resultApi.saveResult,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.completedExams() });
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.examStudents(variables.examId) });
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.examResults(variables.examId) });
    },
  });
};

export const usePublishExamResults = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resultApi.publishExamResults,
    onSuccess: (_, examId) => {
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.completedExams() });
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.examStudents(examId) });
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.examResults(examId) });
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.all });
    },
  });
};

export const useMyResults = (filters = {}, enabled = true) => {
  return useQuery({
    queryKey: RESULT_QUERY_KEYS.myResults(filters),
    queryFn: () => resultApi.getMyResults(filters),
    select: (response) => response?.data || { results: [] },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};
