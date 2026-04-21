import { useQuery } from "@tanstack/react-query";
import { getAuditLogs, getAllSchools } from "./api";

export const useAllSchools = () => {
    return useQuery({
        queryKey: ["allSchools"],
        queryFn: getAllSchools,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
};

export const auditKeys = {
    all: ["auditLogs"],
    list: (filters) => [...auditKeys.all, "list", filters],
};

export const useAuditLogs = (filters) => {
    return useQuery({
        queryKey: auditKeys.list(filters),
        queryFn: () => getAuditLogs(filters),
        keepPreviousData: true,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
