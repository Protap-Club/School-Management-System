import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaChalkboardTeacher, FaCheck, FaChevronLeft, FaChevronRight, FaExclamationTriangle, FaFilePdf, FaTimes, FaUserClock } from "react-icons/fa";
import { readError } from "../../utils";
import { generateTimetablePDF } from "../../utils/pdfGenerator";
import { ButtonSpinner } from "../../components/ui/Spinner";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../auth";
import TimetableGrid from "./components/TimetableGrid";
import TimetableModal from "./components/TimetableModal";
import CreateTimetableDialog from "./components/CreateTimetableDialog";
import { useToastMessage } from "../../hooks/useToastMessage";
import ProxyManagementPage from "../proxy/components/ProxyManagementPage";
import MarkUnavailableModal from "../proxy/components/MarkUnavailableModal";
import { useMyProxyRequests } from "../proxy/api/queries";
import {
    useAvailableClasses,
    useCreateEntry,
    useCreateTimetable,
    useDeleteEntry,
    useMySchedule,
    useMyClassSchedule,
    useTeacherSchedule,
    useTeachers,
    useTimetable,
    useTimetables,
    useTimeSlots,
    useUpdateEntry,
} from "./api/queries";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { makeClassKey, sortClassSections } from "../../utils/classSection";


const flattenSchedule = (schedule) => {
    if (!schedule || typeof schedule !== "object") return [];
    return Object.values(schedule).flat();
};

const toDateOnlyString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const buildDaySlotKey = (dayOfWeek, timeSlotId) => `${dayOfWeek}_${String(timeSlotId)}`;

const TimetablePage = () => {
    const { user } = useAuth();
    const isTeacher = user?.role === "teacher";
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);
    let schoolData = user?.school || user?.schoolId;
    if (!schoolData || !schoolData.name) {
        try {
            const cached = JSON.parse(sessionStorage.getItem('schoolBranding'));
            schoolData = cached?.school || cached || schoolData;
        } catch {
            // Ignore malformed cache payload and fallback to auth school data.
        }
    }
    const schoolName = schoolData?.name || 'School';
    const schoolLogo = schoolData?.logoUrl || null;

    const [adminViewMode, setAdminViewMode] = useState("class");
    const [teacherViewMode, setTeacherViewMode] = useState("schedule"); // schedule | class
    const [activeTab, setActiveTab] = useState("timetable");  // timetable | proxy
    const [weekOffset, setWeekOffset] = useState(0);  // 0 = current week, 1 = next week, etc.
    const [markUnavailableModal, setMarkUnavailableModal] = useState({ open: false, slotInfo: null });
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [selectedClassKey, setSelectedClassKey] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [modalState, setModalState] = useState({ open: false, cell: null });
    const { message: toast, showMessage } = useToastMessage(5000);

    const weekReferenceDate = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDay(); // Sun=0
        const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Monday
        const monday = new Date(today.setDate(diff));
        monday.setDate(monday.getDate() + weekOffset * 7);
        monday.setHours(0, 0, 0, 0);
        return toDateOnlyString(monday);
    }, [weekOffset]);

    const activeWeekDateKeySet = useMemo(() => {
        const monday = new Date(`${weekReferenceDate}T00:00:00`);
        const keySet = new Set();
        for (let i = 0; i < 6; i += 1) {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            keySet.add(toDateOnlyString(dayDate));
        }
        return keySet;
    }, [weekReferenceDate]);

    const timeSlotsQuery = useTimeSlots();
    const timetablesQuery = useTimetables({}, isAdmin);
    const teachersQuery = useTeachers(isAdmin);
    const availableClassesQuery = useAvailableClasses(isAdmin);
    const timeSlots = timeSlotsQuery.data?.data || [];
    const timetables = timetablesQuery.data?.data || [];
    const teachers = teachersQuery.data?.data?.users || [];
    const availableClasses = availableClassesQuery.payload || {
        standards: [],
        sections: [],
        classSections: [],
        subjects: [],
        rooms: [],
    };

    const configuredClassSections = useMemo(
        () => sortClassSections(availableClasses?.classSections || []),
        [availableClasses]
    );

    const configuredClassSectionSet = useMemo(
        () => new Set(configuredClassSections.map((pair) => makeClassKey(pair))),
        [configuredClassSections]
    );

    const sortedTimetables = useMemo(() => {
        const filteredTimetables = timetables.filter((item) => {
            if (configuredClassSectionSet.size === 0) return true;
            const key = `${String(item.standard || "").trim().toLowerCase()}::${String(item.section || "").trim().toUpperCase()}`;
            return configuredClassSectionSet.has(key);
        });

        return [...filteredTimetables].sort((a, b) => {
            const aVal = `${a.standard}${a.section}`;
            const bVal = `${b.standard}${b.section}`;
            return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [configuredClassSectionSet, timetables]);

    const latestTimetableByClassKey = useMemo(() => {
        const map = new Map();

        sortedTimetables.forEach((item) => {
            const key = makeClassKey(item);
            const current = map.get(key);

            if (!current || Number(item.academicYear || 0) >= Number(current.academicYear || 0)) {
                map.set(key, item);
            }
        });

        return map;
    }, [sortedTimetables]);

    const classOptions = useMemo(
        () =>
            configuredClassSections.map((pair) => {
                const key = makeClassKey(pair);
                return {
                    ...pair,
                    key,
                    timetable: latestTimetableByClassKey.get(key) || null,
                };
            }),
        [configuredClassSections, latestTimetableByClassKey]
    );

    useEffect(() => {
        if (!classOptions.length) {
            if (selectedClassKey) {
                setSelectedClassKey("");
            }
            return;
        }

        const stillAvailable = classOptions.some((item) => item.key === selectedClassKey);
        if (!stillAvailable) {
            setSelectedClassKey(classOptions[0].key);
        }
    }, [classOptions, selectedClassKey]);

    const activeClassOption = classOptions.find((item) => item.key === selectedClassKey) || classOptions[0] || null;
    const activeTimetableId = activeClassOption?.timetable?._id || "";
    const activeTeacherId = selectedTeacherId || teachers[0]?._id || "";

    const selectedTimetableQuery = useTimetable(
        activeTimetableId,
        isAdmin && adminViewMode === "class" && Boolean(activeTimetableId)
    );
    const myScheduleQuery = useMySchedule(weekReferenceDate, isTeacher);
    const myClassScheduleQuery = useMyClassSchedule(isTeacher && teacherViewMode === "class");
    const myProxyRequestsQuery = useMyProxyRequests({}, { enabled: isTeacher });
    const teacherScheduleQuery = useTeacherSchedule(
        activeTeacherId,
        null,
        isAdmin && adminViewMode === "teacher" && Boolean(activeTeacherId)
    );

    const createTimetableMutation = useCreateTimetable();
    const createEntryMutation = useCreateEntry();
    const updateEntryMutation = useUpdateEntry();
    const deleteEntryMutation = useDeleteEntry();

    const selectedTimetableEntries = useMemo(
        () => selectedTimetableQuery.data?.data?.entries || [],
        [selectedTimetableQuery.data]
    );
    const teacherScheduleEntries = flattenSchedule(teacherScheduleQuery.data?.data);
    const myScheduleEntries = flattenSchedule(myScheduleQuery.data?.data);
    const myClassInfo = myClassScheduleQuery.data?.data?.timetable;
    const myClassEntries = myClassScheduleQuery.data?.data?.entries || [];
    const myProxyRequests = myProxyRequestsQuery.data?.data || [];

    const myRequestStateByCell = useMemo(() => {
        const map = new Map();

        myProxyRequests.forEach((request) => {
            const requestDateKey = toDateOnlyString(new Date(request.date));
            if (!activeWeekDateKeySet.has(requestDateKey)) return;

            const slotId = request.timeSlotId?._id || request.timeSlotId;
            if (!request.dayOfWeek || !slotId) return;

            const key = buildDaySlotKey(request.dayOfWeek, slotId);
            if (request.status === "pending") {
                map.set(key, { proxyRequestStatus: "pending", proxyRequestId: request._id });
                return;
            }

            if (request.status === "resolved" && request.proxyAssignmentId?.type === "proxy") {
                map.set(key, {
                    proxyRequestStatus: "proxy_assigned",
                    proxyAssignmentId: request.proxyAssignmentId?._id || null,
                    assignedProxyTeacher: request.proxyAssignmentId?.proxyTeacherId || null
                });
                return;
            }

            if (request.status === "resolved" && request.proxyAssignmentId?.type === "free_period") {
                map.set(key, {
                    proxyRequestStatus: "free_period",
                    isFreePeriod: true,
                    proxyType: "free_period"
                });
            }
        });

        return map;
    }, [activeWeekDateKeySet, myProxyRequests]);

    const myScheduleEntriesWithRequestState = useMemo(
        () =>
            myScheduleEntries.map((entry) => {
                if (entry.isProxy) return entry;

                const slotId = entry.timeSlotId?._id || entry.timeSlotId || entry.timeSlot?._id;
                if (!entry.dayOfWeek || !slotId) return entry;

                const requestState = myRequestStateByCell.get(buildDaySlotKey(entry.dayOfWeek, slotId));
                if (!requestState) return entry;

                return { ...entry, ...requestState };
            }),
        [myRequestStateByCell, myScheduleEntries]
    );

    const displayEntries = useMemo(() => {
        if (isTeacher) {
            return teacherViewMode === "class" ? myClassEntries : myScheduleEntriesWithRequestState;
        }
        if (adminViewMode === "teacher") return teacherScheduleEntries;
        return selectedTimetableEntries;
    }, [isTeacher, teacherViewMode, myClassEntries, myScheduleEntriesWithRequestState, teacherScheduleEntries, selectedTimetableEntries]);

    const currentError = errorMessage ||
        readError(timeSlotsQuery.error, "") ||
        readError(timetablesQuery.error, "") ||
        readError(teachersQuery.error, "") ||
        readError(selectedTimetableQuery.error, "") ||
        readError(myScheduleQuery.error, "") ||
        readError(myClassScheduleQuery.error, "") ||
        readError(teacherScheduleQuery.error, "");

    const closeModal = () => {
        setModalState({ open: false, cell: null });
        setErrorMessage("");
    };

    const handleCellClick = (day, slot, entry) => {
        if (isTeacher || adminViewMode !== "class" || !activeTimetableId) return;
        setModalState({ open: true, cell: { day, slot, entry } });
    };

    const handleCreateEntry = async (entryData, entryId) => {
        setErrorMessage("");
        try {
            if (entryId) {
                await updateEntryMutation.mutateAsync({ entryId, data: entryData });
            } else if (activeTimetableId) {
                await createEntryMutation.mutateAsync({ timetableId: activeTimetableId, data: entryData });
            }
            closeModal();
        } catch (error) {
            const apiError = error?.response?.data?.error;
            if (apiError?.code === "TEACHER_SCHEDULE_CONFLICT") {
                showMessage("warning", apiError.message || "Teacher schedule conflict.");
                return;
            }
            setErrorMessage(readError(error, "Failed to save timetable entry."));
        }
    };

    const handleDeleteEntry = async (entryId) => {
        setErrorMessage("");
        try {
            await deleteEntryMutation.mutateAsync(entryId);
            closeModal();
        } catch (error) {
            setErrorMessage(readError(error, "Failed to delete timetable entry."));
        }
    };

    const handleCreateTimetable = async (payload) => {
        setErrorMessage("");
        try {
            await createTimetableMutation.mutateAsync(payload);
            setSelectedClassKey(makeClassKey(payload));
            return true;
        } catch (error) {
            setErrorMessage(readError(error, "Failed to create timetable."));
            return false;
        }
    };

    // Export PDF for admin class view
    const handleExportPDF = async () => {
        if (!activeClassOption || !activeTimetableId || !selectedTimetableEntries.length) return;
        await generateTimetablePDF({
            entries: selectedTimetableEntries,
            timeSlots,
            standard: activeClassOption.standard,
            section: activeClassOption.section,
            academicYear: activeClassOption.timetable?.academicYear || '',
            schoolName,
            schoolLogo,
        });
    };

    // Export PDF for teacher / student personal schedule
    const handleExportSchedulePDF = async () => {
        if (!myScheduleEntries.length) return;
        const firstEntry = myScheduleEntries[0];
        await generateTimetablePDF({
            entries: myScheduleEntries,
            timeSlots,
            standard: firstEntry?.timetableId?.standard || 'My Schedule',
            section: firstEntry?.timetableId?.section || '',
            schoolName,
            schoolLogo,
        });
    };

    const isLoading = timeSlotsQuery.isLoading || (isTeacher ? (myScheduleQuery.isLoading || myClassScheduleQuery.isLoading) : false);
    const isEntryMutationPending = createEntryMutation.isPending || updateEntryMutation.isPending || deleteEntryMutation.isPending;

    // Calculate week dates based on offset
    const getWeekDates = () => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        // Adjust so week starts from Monday (or keep Sunday based on preference)
        const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Monday start
        const monday = new Date(today.setDate(diff));
        monday.setDate(monday.getDate() + weekOffset * 7);

        const dates = {};
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        days.forEach((day, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            dates[day] = date;
        });
        return dates;
    };

    const weekDates = getWeekDates();
    const formatDateShort = (date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <DashboardLayout>
            <div className="space-y-4">
                {toast?.text && (
                    <div className={`fixed top-6 right-6 z-[120] px-5 py-3.5 rounded-2xl shadow-xl flex items-start gap-3 animate-fadeIn backdrop-blur-sm border ${toast?.type === 'warning'
                            ? 'bg-amber-500/90 text-white border-amber-200/40'
                            : toast?.type === 'success'
                                ? 'bg-emerald-500/90 text-white border-emerald-200/40'
                                : 'bg-red-500/90 text-white border-red-200/40'
                        }`}>
                        <div className="mt-0.5 text-white/90">
                            {toast?.type === 'warning' ? <FaExclamationTriangle size={14} />
                                : toast?.type === 'success' ? <FaCheck size={14} />
                                    : <FaTimes size={12} />}
                        </div>
                        <div className="text-sm">
                            <p className="font-semibold">
                                {toast?.type === 'warning' ? 'Schedule Conflict'
                                    : toast?.type === 'success' ? 'Success'
                                        : 'Action Failed'}
                            </p>
                            <p className="opacity-95">{toast.text}</p>
                        </div>
                    </div>
                )}

                {currentError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {currentError}
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex flex-col space-y-1">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Timetable</h1>
                        <p className="text-sm text-gray-500">
                            {isTeacher ? "Manage your teaching hours and academic schedule." : "Academic scheduling and faculty coordination."}
                        </p>
                    </div>

                    {isAdmin ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <Tabs value={adminViewMode} onValueChange={(val) => { setAdminViewMode(val); setActiveTab("timetable"); }} className="bg-gray-100/50 p-1 rounded-lg border border-gray-200/60">
                                <TabsList className="bg-transparent gap-1 h-auto p-0">
                                    <TabsTrigger value="class" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-1.5 data-[state=active]:text-gray-900 text-gray-600">Class</TabsTrigger>
                                    <TabsTrigger value="teacher" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-1.5 data-[state=active]:text-gray-900 text-gray-600">Teacher</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {/* Proxy Management Tab */}
                            <button
                                onClick={() => setActiveTab("proxy")}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${activeTab === "proxy"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                <FaUserClock size={14} />
                                Proxy Management
                            </button>

                            {adminViewMode === "class" ? (
                                <div className="flex items-center gap-3">
                                    <Select value={activeClassOption?.key || ""} onValueChange={setSelectedClassKey}>
                                        <SelectTrigger className="w-52 h-9 text-[13px] font-medium border-gray-200/80 rounded-md focus:ring-gray-200">
                                            <SelectValue placeholder="Select class" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-md border-gray-200/80 shadow-sm">
                                            {classOptions.map((item) => (
                                                <SelectItem key={item.key} value={item.key} className="text-[13px]">
                                                    {item.standard}-{item.section}{item.timetable ? ` (${item.timetable.academicYear})` : " (Not created)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        className="h-9 px-4 text-[13px] font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-md transition-colors shadow-none"
                                        onClick={() => setCreateDialogOpen(true)}
                                    >
                                        New Schedule
                                    </Button>
                                    {activeTimetableId && selectedTimetableEntries.length > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-9 px-4 text-[13px] font-medium border-gray-200 rounded-md transition-colors shadow-none flex items-center gap-1.5"
                                            onClick={handleExportPDF}
                                        >
                                            <FaFilePdf size={12} />
                                            Export PDF
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Select value={activeTeacherId} onValueChange={setSelectedTeacherId}>
                                    <SelectTrigger className="w-52 h-9 text-[13px] font-medium border-gray-200/80 rounded-md focus:ring-gray-200">
                                        <SelectValue placeholder="Select teacher" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-md border-gray-200/80 shadow-sm">
                                        {teachers.map((teacher) => (
                                            <SelectItem key={teacher._id} value={teacher._id} className="text-[13px]">
                                                {teacher.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Tabs value={teacherViewMode} onValueChange={setTeacherViewMode} className="bg-gray-100/50 p-1 rounded-lg border border-gray-200/60">
                                <TabsList className="bg-transparent gap-1 h-auto p-0">
                                    <TabsTrigger value="schedule" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-1.5 data-[state=active]:text-gray-900 text-gray-600">Schedule</TabsTrigger>
                                    <TabsTrigger value="class" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-1.5 data-[state=active]:text-gray-900 text-gray-600">Class</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            {teacherViewMode === "schedule" && myScheduleEntries.length > 0 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 px-4 text-[13px] font-medium border-gray-200 rounded-md transition-colors shadow-none flex items-center gap-1.5"
                                    onClick={handleExportSchedulePDF}
                                >
                                    <FaFilePdf size={12} />
                                    Export PDF
                                </Button>
                            )}
                            {teacherViewMode === "class" && myClassInfo && (
                                <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 border border-blue-200/80 px-3 py-1.5 text-xs font-medium text-blue-700">
                                    <FaChalkboardTeacher size={14} />
                                    Class {myClassInfo.standard}-{myClassInfo.section}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {activeTab === "proxy" && isAdmin ? (
                    <ProxyManagementPage />
                ) : isLoading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200/80 bg-white">
                        <ButtonSpinner className="text-2xl text-gray-400" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {isAdmin && adminViewMode === "class" && activeClassOption && !activeTimetableId && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-700 flex items-center gap-3">
                                <span>No timetable exists yet for <span className="font-semibold">{activeClassOption.standard}-{activeClassOption.section}</span>. Click <strong>New Schedule</strong> to initialize it.</span>
                            </div>
                        )}

                        {/* Week Navigation - only show for teacher view */}
                        {isTeacher && (
                            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setWeekOffset(w => w - 1)}
                                        className="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg transition-all border border-transparent hover:border-gray-200"
                                    >
                                        <FaChevronLeft size={14} />
                                    </button>
                                    <button
                                        onClick={() => setWeekOffset(0)}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${weekOffset === 0
                                                ? 'bg-white text-gray-900 border border-gray-300 shadow-sm'
                                                : 'text-gray-600 hover:bg-white hover:border-gray-200 border border-transparent'
                                            }`}
                                    >
                                        This Week
                                    </button>
                                    <button
                                        onClick={() => setWeekOffset(w => w + 1)}
                                        className="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg transition-all border border-transparent hover:border-gray-200"
                                    >
                                        <FaChevronRight size={14} />
                                    </button>
                                </div>
                                <div className="text-sm text-gray-600">
                                    {formatDateShort(weekDates["Mon"])} - {formatDateShort(weekDates["Sat"])}
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto pb-4 pt-1">
                            <div className="min-w-[900px]">
                                <TimetableGrid
                                    entries={displayEntries}
                                    timeSlots={timeSlots}
                                    teachers={teachers}
                                    weekDates={weekDates}
                                    formatDateShort={formatDateShort}
                                    onCellClick={handleCellClick}
                                    onMarkUnavailable={(day, slot, entry) => {
                                        setMarkUnavailableModal({
                                            open: true,
                                            slotInfo: {
                                                dayOfWeek: day,
                                                timeSlot: slot,
                                                date: weekDates[day], // Use actual date from week view
                                                subject: entry?.subject,
                                                standard: entry?.timetableId?.standard,
                                                section: entry?.timetableId?.section,
                                                entry
                                            }
                                        });
                                    }}
                                    readOnly={isTeacher || adminViewMode === "teacher" || (isAdmin && adminViewMode === "class" && !activeTimetableId)}
                                    showClass={isTeacher || adminViewMode === "teacher"}
                                    isTeacherView={isTeacher}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <TimetableModal
                isOpen={modalState.open}
                onClose={closeModal}
                onSave={handleCreateEntry}
                onDelete={handleDeleteEntry}
                initialData={modalState.cell?.entry}
                slotInfo={modalState.cell ? { day: modalState.cell.day, slot: modalState.cell.slot } : null}
                teachers={teachers}
                subjects={availableClasses.subjects || []}
                rooms={availableClasses.rooms || []}
                loading={isEntryMutationPending}
                defaultRoom={activeClassOption ? `Class ${activeClassOption.standard}-${activeClassOption.section}` : ""}
            />

            <CreateTimetableDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onCreate={handleCreateTimetable}
                isPending={createTimetableMutation.isPending}
                availableClasses={availableClasses}
            />

            <MarkUnavailableModal
                isOpen={markUnavailableModal.open}
                onClose={() => setMarkUnavailableModal({ open: false, slotInfo: null })}
                slotInfo={markUnavailableModal.slotInfo}
                onSuccess={() => {
                    showMessage("success", "Proxy request created successfully");
                }}
                onError={(errorMessage) => {
                    showMessage("error", errorMessage);
                }}
            />
        </DashboardLayout>
    );
};

export default TimetablePage;
