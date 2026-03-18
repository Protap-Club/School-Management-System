import { useMemo, useState } from "react";
import { FaCalendarAlt, FaChalkboardTeacher, FaSpinner } from "react-icons/fa";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../auth";
import TimetableGrid from "./components/TimetableGrid";
import TimetableModal from "./components/TimetableModal";
import CreateTimetableDialog from "./components/CreateTimetableDialog";
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

const fallbackError = "Failed to load timetable data.";

const readError = (error, fallback = fallbackError) => {
    return error?.response?.data?.message || error?.message || fallback;
};

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
    const [selectedTimetableId, setSelectedTimetableId] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [modalState, setModalState] = useState({ open: false, cell: null });

    const timeSlotsQuery = useTimeSlots();
    const timetablesQuery = useTimetables({}, isAdmin);
    const teachersQuery = useTeachers(isAdmin);
    const availableClassesQuery = useAvailableClasses(isAdmin);
    const timeSlots = timeSlotsQuery.data?.data || [];
    const timetables = timetablesQuery.data?.data || [];
    const teachers = teachersQuery.data?.data?.users || [];
    const availableClasses = availableClassesQuery.data?.data || { standards: [], sections: [], subjects: [], rooms: [] };

    const sortedTimetables = useMemo(() => {
        return [...timetables].sort((a, b) => {
            const aVal = `${a.standard}${a.section}`;
            const bVal = `${b.standard}${b.section}`;
            return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [timetables]);

    const activeTimetableId = selectedTimetableId || sortedTimetables[0]?._id || "";
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
        if (isTeacher || adminViewMode !== "class") return;
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
            const result = await createTimetableMutation.mutateAsync(payload);
            const createdId = result?.data?._id;
            if (createdId) setSelectedTimetableId(createdId);
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
                {currentError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {currentError}
                    </div>
                )}

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
                            <FaCalendarAlt className="text-primary" />
                            Timetable
                        </h1>
                        <p className="mt-0.5 text-sm text-gray-500">
                            {isTeacher ? "View your weekly schedule." : "Manage class and teacher schedules."}
                        </p>
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
                                    <Select value={activeTimetableId} onValueChange={setSelectedTimetableId}>
                                        <SelectTrigger className="w-52">
                                            <SelectValue placeholder="Select timetable" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sortedTimetables.map((tt) => (
                                                <SelectItem key={tt._id} value={tt._id}>
                                                    {tt.standard}-{tt.section} ({tt.academicYear})
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
                        <FaSpinner className="animate-spin text-2xl text-primary" />
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                        <TimetableGrid
                            entries={displayEntries}
                            timeSlots={timeSlots}
                            teachers={teachers}
                            onCellClick={handleCellClick}
                            readOnly={isTeacher || adminViewMode === "teacher"}
                            showClass={isTeacher || adminViewMode === "teacher"}
                        />
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
