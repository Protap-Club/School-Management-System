import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaChalkboardTeacher, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { readError } from "../../utils";
import { ButtonSpinner } from "../../components/ui/Spinner";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../auth";
import TimetableGrid from "./components/TimetableGrid";
import TimetableModal from "./components/TimetableModal";
import CreateTimetableDialog from "./components/CreateTimetableDialog";
import { useToastMessage } from "../../hooks/useToastMessage";
import {
    useAvailableClasses,
    useCreateEntry,
    useCreateTimetable,
    useDeleteEntry,
    useMySchedule,
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

const TimetablePage = () => {
    const { user } = useAuth();
    const isTeacher = user?.role === "teacher";
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);

    const [adminViewMode, setAdminViewMode] = useState("class");
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [selectedClassKey, setSelectedClassKey] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [modalState, setModalState] = useState({ open: false, cell: null });
    const { message: toast, showMessage } = useToastMessage(5000);

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
    const myScheduleQuery = useMySchedule(isTeacher);
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

    const displayEntries = useMemo(() => {
        if (isTeacher) return myScheduleEntries;
        if (adminViewMode === "teacher") return teacherScheduleEntries;
        return selectedTimetableEntries;
    }, [isTeacher, adminViewMode, myScheduleEntries, teacherScheduleEntries, selectedTimetableEntries]);

    const currentError = errorMessage ||
        readError(timeSlotsQuery.error, "") ||
        readError(timetablesQuery.error, "") ||
        readError(teachersQuery.error, "") ||
        readError(selectedTimetableQuery.error, "") ||
        readError(myScheduleQuery.error, "") ||
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

    const isLoading = timeSlotsQuery.isLoading || (isTeacher ? myScheduleQuery.isLoading : false);
    const isEntryMutationPending = createEntryMutation.isPending || updateEntryMutation.isPending || deleteEntryMutation.isPending;

    return (
        <DashboardLayout>
            <div className="space-y-4">
                {toast?.text && (
                    <div className={`fixed top-6 right-6 z-[120] px-5 py-3.5 rounded-2xl shadow-xl flex items-start gap-3 animate-fadeIn backdrop-blur-sm border ${toast?.type === 'warning'
                        ? 'bg-amber-500/90 text-white border-amber-200/40'
                        : 'bg-red-500/90 text-white border-red-200/40'
                        }`}>
                        <div className="mt-0.5 text-white/90">
                            {toast?.type === 'warning' ? <FaExclamationTriangle size={14} /> : <FaTimes size={12} />}
                        </div>
                        <div className="text-sm">
                            <p className="font-semibold">
                                {toast?.type === 'warning' ? 'Schedule Conflict' : 'Action Failed'}
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
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary transform hover:rotate-6 transition-transform">
                            <FaCalendarAlt size={32} />
                        </div>
                        <div className="space-y-1">
                            <h1 className="page-title">Timetable</h1>
                            <p className="page-subtitle">
                                {isTeacher ? "View your weekly schedule." : "Manage class and teacher schedules."}
                            </p>
                        </div>
                    </div>

                    {isAdmin ? (
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
                            <Tabs value={adminViewMode} onValueChange={setAdminViewMode}>
                                <TabsList>
                                    <TabsTrigger value="class">Class</TabsTrigger>
                                    <TabsTrigger value="teacher">Teacher</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {adminViewMode === "class" ? (
                                <div className="flex items-center gap-2">
                                    <Select value={activeClassOption?.key || ""} onValueChange={setSelectedClassKey}>
                                        <SelectTrigger className="w-52">
                                            <SelectValue placeholder="Select class" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classOptions.map((item) => (
                                                <SelectItem key={item.key} value={item.key}>
                                                    {item.standard}-{item.section}{item.timetable ? ` (${item.timetable.academicYear})` : " (Not created)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                                        New
                                    </Button>
                                </div>
                            ) : (
                                <Select value={activeTeacherId} onValueChange={setSelectedTeacherId}>
                                    <SelectTrigger className="w-52">
                                        <SelectValue placeholder="Select teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers.map((teacher) => (
                                            <SelectItem key={teacher._id} value={teacher._id}>
                                                {teacher.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                            <FaChalkboardTeacher />
                            My Schedule
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-gray-100 bg-white">
                        <ButtonSpinner className="text-2xl" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {isAdmin && adminViewMode === "class" && activeClassOption && !activeTimetableId && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                No timetable exists yet for {activeClassOption.standard}-{activeClassOption.section}. Click `New` to create it.
                            </div>
                        )}

                        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                            <TimetableGrid
                                entries={displayEntries}
                                timeSlots={timeSlots}
                                teachers={teachers}
                                onCellClick={handleCellClick}
                                readOnly={isTeacher || adminViewMode === "teacher" || (isAdmin && adminViewMode === "class" && !activeTimetableId)}
                                showClass={isTeacher || adminViewMode === "teacher"}
                            />
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
            />

            <CreateTimetableDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onCreate={handleCreateTimetable}
                isPending={createTimetableMutation.isPending}
                availableClasses={availableClasses}
            />
        </DashboardLayout>
    );
};

export default TimetablePage;
