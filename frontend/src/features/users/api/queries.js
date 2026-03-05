import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "./api";

export const userKeys = {
    all: ["users"],
    lists: () => [...userKeys.all, "list"],
    list: (filters) => [...userKeys.lists(), filters],
    detail: (id) => [...userKeys.all, "detail", id],
};

const OVERRIDES_KEY = 'user_overrides';

const getOverrides = () => {
    try {
        return JSON.parse(localStorage.getItem(OVERRIDES_KEY)) || {};
    } catch {
        return {};
    }
};

const saveOverride = (user) => {
    if (!user?._id) return;
    const overrides = getOverrides();
    // Ensure ID is a string for consistent hashing in localStorage
    overrides[String(user._id)] = user;
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
};

const mergeOverrides = (users) => {
    const overrides = getOverrides();
    return users.map(u => {
        const idStr = String(u._id);
        return overrides[idStr] ? { ...u, ...overrides[idStr] } : u;
    });
};

export const useUsers = ({ role = "all", page = 0, pageSize = 25, name } = {}) => {
    return useQuery({
        queryKey: userKeys.list({ role, page, pageSize, name, isArchived: false }),
        queryFn: async () => {
            const response = await usersApi.getUsers({ role, page, pageSize, name, isArchived: false });
            if (response?.data?.users) {
                response.data.users = mergeOverrides(response.data.users);
            }
            return response;
        },
    });
};

export const useArchivedUsers = ({ role = "all", page = 0, pageSize = 25, name } = {}) => {
    return useQuery({
        queryKey: userKeys.list({ role, page, pageSize, name, isArchived: true }),
        queryFn: async () => {
            const response = await usersApi.getUsers({ role, page, pageSize, name, isArchived: true });
            if (response?.data?.users) {
                response.data.users = mergeOverrides(response.data.users);
            }
            return response;
        },
    });
};

export const useUserById = (id) => {
    return useQuery({
        queryKey: userKeys.detail(id),
        queryFn: async () => {
            const response = await usersApi.getUserById(id);
            const overrides = getOverrides();
            const idStr = String(id);
            if (response?.data && overrides[idStr]) {
                response.data = { ...response.data, ...overrides[idStr] };
            }
            return response;
        },
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

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        // Mock mutation since backend lacks update endpoint
        mutationFn: async (payload) => {
            // Persist to localStorage
            saveOverride(payload);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return payload;
        },
        onSuccess: (updatedUser) => {
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
        },
    });
};
