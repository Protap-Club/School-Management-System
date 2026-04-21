import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { usersApi } from "./api";
import { attendanceKeys } from "../../attendance/api/queries";
import { selectAccessToken } from "../../auth/authSlice";
import { patchTeacherExpectedSalaryInUsersCache } from "./cache";

export const userKeys = {
    all: ["users"],
    lists: () => [...userKeys.all, "list"],
    list: (filters) => [...userKeys.lists(), filters],
    detail: (id) => [...userKeys.all, "detail", id],
};

const useProtectedQueryEnabled = (enabled = true) => {
    const accessToken = useSelector(selectAccessToken);
    return Boolean(accessToken) && enabled;
};

export const useUsers = ({ role = "all", page = 0, pageSize = 25, name, enabled = true } = {}) => {
    const queryEnabled = useProtectedQueryEnabled(enabled);
    return useQuery({
        queryKey: userKeys.list({ role, page, pageSize, name, isArchived: false }),
        queryFn: () => usersApi.getUsers({ role, page, pageSize, name, isArchived: false }),
        enabled: queryEnabled
    });
};

export const useNextRollNumber = (standard, section, { enabled = false } = {}) => {
    return useQuery({
        queryKey: ["users", "next-roll-number", standard, section],
        queryFn: () => usersApi.getNextRollNumber(standard, section),
        enabled: enabled && !!standard && !!section,
        staleTime: 0, // Always get fresh suggestion
    });
};

export const useArchivedUsers = ({ role = "all", page = 0, pageSize = 25, name, enabled = true } = {}) => {
    const queryEnabled = useProtectedQueryEnabled(enabled);
    return useQuery({
        queryKey: userKeys.list({ role, page, pageSize, name, isArchived: true }),
        queryFn: () => usersApi.getUsers({ role, page, pageSize, name, isArchived: true }),
        enabled: queryEnabled
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

export const useUpdateTeacherExpectedSalary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => usersApi.updateTeacherProfile(id, payload),
        onSuccess: (_response, variables) => {
            patchTeacherExpectedSalaryInUsersCache(
                queryClient,
                variables.id,
                variables.payload.expectedSalary
            );
        },
    });
};
