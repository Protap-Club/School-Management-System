import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resultApi } from './api';

export const RESULT_QUERY_KEYS = {
  all: ['results'],
  completedExams: () => [...RESULT_QUERY_KEYS.all, 'completedExams'],
  examStudents: (examId) => [...RESULT_QUERY_KEYS.all, 'examStudents', examId],
  examResults: (examId) => [...RESULT_QUERY_KEYS.all, 'examResults', examId],
  myResults: (filters = {}) => [...RESULT_QUERY_KEYS.all, 'myResults', filters],
};

export const useCompletedResultExams = () => {
  return useQuery({
    queryKey: RESULT_QUERY_KEYS.completedExams(),
    queryFn: resultApi.getCompletedExams,
    select: (response) => response?.data || [],
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
