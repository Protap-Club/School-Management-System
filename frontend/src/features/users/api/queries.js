import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "./api";

export const userKeys = {
    all: ["users"],
    lists: () => [...userKeys.all, "list"],
    list: (filters) => [...userKeys.lists(), filters],
    detail: (id) => [...userKeys.all, "detail", id],
};

export const useUsers = ({ role = "all", page = 0, pageSize = 25, name } = {}) => {
    return useQuery({
        queryKey: userKeys.list({ role, page, pageSize, name, isArchived: false }),
        queryFn: () => usersApi.getUsers({ role, page, pageSize, name, isArchived: false }),
    });
};

export const useArchivedUsers = ({ role = "all", page = 0, pageSize = 25, name } = {}) => {
    return useQuery({
        queryKey: userKeys.list({ role, page, pageSize, name, isArchived: true }),
        queryFn: () => usersApi.getUsers({ role, page, pageSize, name, isArchived: true }),
    });
};

export const useUserById = (id) => {
    return useQuery({
        queryKey: userKeys.detail(id),
        queryFn: () => usersApi.getUserById(id),
        enabled: Boolean(id),
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        },
    });
};

export const useToggleUserStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, isArchived }) => usersApi.toggleArchive({ userIds: [userId], isArchived }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
};

export const useToggleUsersStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.toggleArchive,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
};
