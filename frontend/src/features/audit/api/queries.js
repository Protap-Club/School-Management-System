import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "./api";

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
