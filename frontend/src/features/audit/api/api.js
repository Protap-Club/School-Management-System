import axios from "@/lib/axios";

export const getAuditLogs = async (params) => {
    const { data } = await axios.get("/audit", { params });
    return data;
};
