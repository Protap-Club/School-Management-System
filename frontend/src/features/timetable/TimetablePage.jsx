import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaChalkboardTeacher, FaExclamationTriangle, FaFilePdf, FaTimes } from "react-icons/fa";
import { readError } from "../../utils";
import { generateTimetablePDF } from "../../utils/pdfGenerator";
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
    let schoolData = user?.school || user?.schoolId;
    if (!schoolData || !schoolData.name) {
        try {
            const cached = JSON.parse(sessionStorage.getItem('schoolBranding'));
            schoolData = cached?.school || cached || schoolData;
        } catch (e) { }
    }
    const schoolName = schoolData?.name || 'School';
    const schoolLogo = schoolData?.logoUrl || null;

    // Determine if this teacher is a class teacher and which class they own
    const classTeacherOf = isTeacher ? user?.profile?.classTeacherOf : null;
    const isClassTeacher = !!(classTeacherOf?.standard && classTeacherOf?.section);

    const [adminViewMode, setAdminViewMode] = useState("class");
    const [teacherTab, setTeacherTab] = useState("class"); // "class" | "schedule"
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

    const myScheduleQuery = useMySchedule(isTeacher);

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
    
    // myScheduleQuery returns { isClassTeacher, personalSchedule, classTimetable } for teachers
    // and { Mon: [...], Tue: [...] } for students
    const myScheduleData = myScheduleQuery.data?.data;
    const myScheduleRaw = isTeacher ? myScheduleData?.personalSchedule : myScheduleData;
    const myClassTimetableRaw = isTeacher ? myScheduleData?.classTimetable?.schedule : null;
    const isClassTeacherFromData = isTeacher && myScheduleData?.isClassTeacher;

    const myScheduleEntries = flattenSchedule(myScheduleRaw);
    const myClassTimetableEntries = flattenSchedule(myClassTimetableRaw);

    const displayEntries = useMemo(() => {
        if (isTeacher) {
            // Class teachers: switch between homeroom class timetable and personal schedule
            if (isClassTeacherFromData && teacherTab === "class") return myClassTimetableEntries;
            return myScheduleEntries;
        }
        if (adminViewMode === "teacher") return teacherScheduleEntries;
        return selectedTimetableEntries;
    }, [isTeacher, isClassTeacher, teacherTab, adminViewMode, myScheduleEntries, myClassTimetableEntries, teacherScheduleEntries, selectedTimetableEntries]);

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
        await generateTimetablePDF({
            entries: myScheduleEntries,
            timeSlots,
            standard: `${user?.profile?.name || user?.name || 'Faculty'}'s Schedule`,
            section: '',
            academicYear: '',
            schoolName,
            schoolLogo,
        });
    };

    // Export PDF for admin viewing a teacher's schedule
    const handleExportAdminTeacherPDF = async () => {
        if (!teacherScheduleEntries.length || !activeTeacherId) return;
        const teacher = teachers.find(t => t._id === activeTeacherId);
        await generateTimetablePDF({
            entries: teacherScheduleEntries,
            timeSlots,
            standard: teacher ? `${teacher.name}'s Schedule` : 'Teacher Schedule',
            section: '',
            academicYear: '',
            schoolName,
            schoolLogo,
        });
    };

    // Export PDF for teacher viewing their homeroom class
    const handleExportClassPDF = async () => {
        if (!myClassTimetableEntries.length) return;
        
        let academicYear = '';
        if (myScheduleData?.classTimetable?.schedule?.length > 0) {
           const someEntry = myScheduleData.classTimetable.schedule.find(d => d.entries && d.entries.length > 0);
           if (someEntry && someEntry.entries[0]?.timetableId) {
               academicYear = someEntry.entries[0].timetableId.academicYear;
           }
        }

        await generateTimetablePDF({
            entries: myClassTimetableEntries,
            timeSlots,
            standard: classTeacherOf?.standard || 'Class',
            section: classTeacherOf?.section || '',
            academicYear,
            schoolName,
            schoolLogo,
        });
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
                    <div className="flex flex-col space-y-1">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Timetable</h1>
                        <p className="text-sm text-gray-500">
                            {isTeacher ? "Manage your teaching hours and academic schedule." : "Academic scheduling and faculty coordination."}
                        </p>
                    </div>

                    {isAdmin ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <Tabs value={adminViewMode} onValueChange={setAdminViewMode} className="bg-gray-100/50 p-1 rounded-lg border border-gray-200/60">
                                <TabsList className="bg-transparent gap-1 h-auto p-0">
                                    <TabsTrigger value="class" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-1.5 data-[state=active]:text-gray-900 text-gray-600">Class</TabsTrigger>
                                    <TabsTrigger value="teacher" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-1.5 data-[state=active]:text-gray-900 text-gray-600">Teacher</TabsTrigger>
                                </TabsList>
                            </Tabs>

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
                                <div className="flex items-center gap-3">
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
                                    {activeTeacherId && teacherScheduleEntries.length > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-9 px-4 text-[13px] font-medium border-gray-200 rounded-md transition-colors shadow-none flex items-center gap-1.5"
                                            onClick={handleExportAdminTeacherPDF}
                                        >
                                            <FaFilePdf size={12} />
                                            Export PDF
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : isTeacher && isClassTeacherFromData ? (
                        // Class teacher: two tabs — homeroom class timetable + personal schedule
                        <div className="flex flex-wrap items-center gap-3">
                            <Tabs value={teacherTab} onValueChange={setTeacherTab} className="bg-gray-100/50 p-1 rounded-lg border border-gray-200/60">
                                <TabsList className="bg-transparent gap-1 h-auto p-0">
                                    <TabsTrigger value="class" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-1.5 data-[state=active]:text-gray-900 text-gray-600">
                                        Class {myScheduleData?.classTimetable?.classLabel || `${classTeacherOf?.standard}-${classTeacherOf?.section}`}
                                    </TabsTrigger>
                                    <TabsTrigger value="schedule" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-1.5 data-[state=active]:text-gray-900 text-gray-600">
                                        My Schedule
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            {(teacherTab === "schedule" ? myScheduleEntries : myClassTimetableEntries).length > 0 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 px-4 text-[13px] font-medium border-gray-200 rounded-md transition-colors shadow-none flex items-center gap-1.5"
                                    onClick={teacherTab === "schedule" ? handleExportSchedulePDF : handleExportClassPDF}
                                >
                                    <FaFilePdf size={12} />
                                    Export PDF
                                </Button>
                            )}
                        </div>
                    ) : (
                        // Regular (subject-only) teacher: just their schedule
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 rounded-md bg-gray-100 border border-gray-200/80 px-3 py-1.5 text-xs font-medium text-gray-600">
                                <FaChalkboardTeacher size={14} />
                                Active Faculty Schedule
                            </div>
                            {myScheduleEntries.length > 0 && (
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
                        </div>
                    )}
                </div>

                {isLoading ? (
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

                        {/* Class teacher's homeroom — no entries notice */}
                        {isTeacher && isClassTeacherFromData && teacherTab === "class" && myClassTimetableEntries.length === 0 && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-700">
                                No timetable has been created yet for Class {myScheduleData?.classTimetable?.classLabel || 'assigned'}.
                            </div>
                        )}

                        <div className="overflow-x-auto pb-4 pt-1">
                            <div className="min-w-[900px]">
                                <TimetableGrid
                                    entries={displayEntries}
                                    timeSlots={timeSlots}
                                    teachers={teachers}
                                    onCellClick={handleCellClick}
                                    readOnly={isTeacher || adminViewMode === "teacher" || (isAdmin && adminViewMode === "class" && !activeTimetableId)}
                                    showClass={isTeacher && teacherTab === "schedule" || adminViewMode === "teacher"}
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
        </DashboardLayout>
    );
};

export default TimetablePage;
