import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "./api";
import { attendanceKeys } from "../../attendance/api/queries";

export const userKeys = {
    all: ["users"],
    lists: () => [...userKeys.all, "list"],
    list: (filters) => [...userKeys.lists(), filters],
    detail: (id) => [...userKeys.all, "detail", id],
};

export const useUsers = ({ role = "all", page = 0, pageSize = 25, name, enabled = true } = {}) => {
    return useQuery({
        queryKey: userKeys.list({ role, page, pageSize, name, isArchived: false }),
        queryFn: () => usersApi.getUsers({ role, page, pageSize, name, isArchived: false }),
        enabled
    });
};

export const useArchivedUsers = ({ role = "all", page = 0, pageSize = 25, name, enabled = true } = {}) => {
    return useQuery({
        queryKey: userKeys.list({ role, page, pageSize, name, isArchived: true }),
        queryFn: () => usersApi.getUsers({ role, page, pageSize, name, isArchived: true }),
        enabled
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.createUser,
        onSuccess: () => {
            // Invalidate the entire users cache so every list (by role, page, etc.) refreshes
            queryClient.invalidateQueries({ queryKey: userKeys.all });
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};

export const useToggleUserStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, isArchived }) => usersApi.toggleArchive({ userIds: [userId], isArchived }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};

export const useToggleUsersStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.toggleArchive,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => usersApi.updateUser(id, payload),
        onSuccess: (response) => {
            const updatedUser = response?.data?.user;
            if (!updatedUser?._id) return;
            const idStr = String(updatedUser._id);
            // Update the main user list cache
            queryClient.setQueriesData({ queryKey: userKeys.lists() }, (oldData) => {
                if (!oldData?.data?.users) return oldData;
                return {
                    ...oldData,
                    data: {
                        ...oldData.data,
                        users: oldData.data.users.map(u =>
                            String(u._id) === idStr ? { ...u, ...updatedUser } : u
                        )
                    }
                };
            });
            // Update individual detail cache if it exists
            queryClient.setQueryData(userKeys.detail(updatedUser._id), (oldUser) => {
                if (!oldUser?.data) return oldUser;
                return {
                    ...oldUser,
                    data: { ...oldUser.data, ...updatedUser }
                };
            });
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};
