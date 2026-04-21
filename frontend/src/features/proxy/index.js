// Proxy Management Feature - Public API

// API Hooks
export {
    // Query keys
    proxyKeys,
    // Teacher hooks
    useCreateProxyRequest,
    useMyProxyRequests,
    useCancelProxyRequest,
    useMyScheduleWithProxies,
    // Admin hooks
    useProxyRequests,
    useAvailableTeachers,
    useAssignProxyTeacher,
    useMarkAsFreePeriod,
    useCreateDirectAssignment,
    useProxyAssignments,
    useTimetableWithProxies,
} from "./api/queries";

// API (for direct access if needed)
export { proxyApi } from "./api/api";
