import api from "../../../lib/axios";

export const getTimeSlots = async () => {
    const response = await api.get("/timetables/slots");
    return response.data;
};

export const createTimeSlot = async (data) => {
    const response = await api.post("/timetables/slots", data);
    return response.data;
};

export const updateTimeSlot = async ({ id, data }) => {
    const response = await api.put(`/timetables/slots/${id}`, data);
    return response.data;
};

export const deleteTimeSlot = async (id) => {
    const response = await api.delete(`/timetables/slots/${id}`);
    return response.data;
};

export const getTimetables = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.standard) params.append("standard", filters.standard);
    if (filters.section) params.append("section", filters.section);
    if (filters.academicYear) params.append("academicYear", String(filters.academicYear));

    const qs = params.toString();
    const response = await api.get(qs ? `/timetables?${qs}` : "/timetables");
    return response.data;
};

export const getTimetableById = async (id) => {
    const response = await api.get(`/timetables/${id}`);
    return response.data;
};

export const createTimetable = async (data) => {
    const response = await api.post("/timetables", data);
    return response.data;
};

export const deleteTimetable = async (id) => {
    const response = await api.delete(`/timetables/${id}`);
    return response.data;
};

export const createEntry = async ({ timetableId, data }) => {
    const response = await api.post(`/timetables/${timetableId}/entries`, data);
    return response.data;
};

export const updateEntry = async ({ entryId, data }) => {
    const response = await api.patch(`/timetables/entries/${entryId}`, data);
    return response.data;
};

export const deleteEntry = async (entryId) => {
    const response = await api.delete(`/timetables/entries/${entryId}`);
    return response.data;
};

export const getMySchedule = async () => {
    const response = await api.get("/timetables/schedule/me");
    return response.data;
};

export const getTeacherSchedule = async (teacherId, academicYear = null) => {
    const qs = academicYear ? `?academicYear=${academicYear}` : "";
    const response = await api.get(`/timetables/schedule/${teacherId}${qs}`);
    return response.data;
};

export const getTeachers = async () => {
    const response = await api.get("/users?role=teacher&pageSize=100&isArchived=false");
    return response.data;
};

export const getSchoolClasses = async () => {
    const response = await api.get("/school/classes");
    return response.data;
};
