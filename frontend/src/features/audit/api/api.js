import axios from "@/lib/axios";

export const getAuditLogs = async (params) => {
    // Strip empty-string / nullish values so the backend never receives
    // query params like action_type=&severity=& that fail enum validation.
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    );
    const { data } = await axios.get("/audit", { params: cleanParams });
    return data;
};

