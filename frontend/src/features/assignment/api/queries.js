import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assignmentApi } from "./api";

export const assignmentKeys = {
    all: ["assignments"],
    lists: () => [...assignmentKeys.all, "list"],
    list: (filters) => [...assignmentKeys.lists(), filters],
    detail: (id) => [...assignmentKeys.all, "detail", id],
    metadata: () => [...assignmentKeys.all, "metadata"],
};

export const useAssignments = ({ status = "all", standard = "all", section = "all", subject = "all", search = "", page = 0, pageSize = 25 } = {}) => {
    return useQuery({
        queryKey: assignmentKeys.list({ status, standard, section, subject, search, page, pageSize }),
        queryFn: async () => {
            const response = await assignmentApi.getAssignments({ status, standard, section, subject, search, page, pageSize });
            return response;
        },
    });
};

export const useAssignmentById = (id) => {
    return useQuery({
        queryKey: assignmentKeys.detail(id),
        queryFn: () => assignmentApi.getAssignmentById(id),
        enabled: Boolean(id),
    });
};

export const useCreateAssignment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: assignmentApi.createAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
        },
    });
};

export const useUpdateAssignment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, formData }) => assignmentApi.updateAssignment(id, formData),
        onSuccess: (updatedAssignment, variables) => {
            queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
            queryClient.invalidateQueries({ queryKey: assignmentKeys.detail(variables.id) });
        },
    });
};

export const useDeleteAssignment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: assignmentApi.deleteAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
        },
    });
};

export const useAssignmentMetadata = () => {
    return useQuery({
        queryKey: assignmentKeys.metadata(),
        queryFn: async () => {
            const response = await assignmentApi.getMetadata();
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
