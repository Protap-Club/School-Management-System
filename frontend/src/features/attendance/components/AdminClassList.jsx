import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaUserTie, FaSearch, FaArrowLeft, FaExchangeAlt } from 'react-icons/fa';
import { Switch } from "@/components/ui/switch";
import { useAuth } from '../../auth';
import { PaginationControls } from '../../../components/ui/PaginationControls';
import { formatValue } from '../../../utils';

const AdminClassList = ({
    groupedClasses,
    expandedClasses,
    setExpandedClasses,
    getClassPage,
    setClassPage,
    itemsPerPage,
    setSelectedStudent,
    getStudentStatus,
    STATUS_STYLES,
    STATUS_LABELS,
    handleManualToggle,
    manualMutation,
    teachers = [],
    onReplaceClassTeacher,
    replaceTeacherPending = false,
    onPageSizeChange,
}) => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { classId } = useParams();
    const isDetailView = !!classId;

    const rolePath = currentUser?.role === 'super_admin' ? '/superadmin' : '/admin';

    const [studentSearchQuery, setStudentSearchQuery] = React.useState("");
    const [replaceModalClass, setReplaceModalClass] = React.useState(null);
    const [replacementTeacherId, setReplacementTeacherId] = React.useState("");
    const [replaceMode, setReplaceMode] = React.useState("replace");
    const [replaceError, setReplaceError] = React.useState("");

    // Helper: check if teacher is a class teacher
    const getTeacherClass = (teacher) => {
        if (!teacher?.profile) return null;
        const classTeacherOf = teacher.profile.classTeacherOf;
        if (classTeacherOf?.standard && classTeacherOf?.section) {
            return classTeacherOf;
        }
        return teacher.profile.assignedClasses?.[0] || null;
    };

    // Filter candidates based on mode
    const replacementCandidates = React.useMemo(() => {
        if (!replaceModalClass) return [];
        const otherTeachers = (teachers || []).filter((teacher) => String(teacher._id) !== String(replaceModalClass.teacher?._id));

        if (replaceMode === "replace") {
            // Replace: only show teachers WITHOUT a class (unassigned teachers)
            return otherTeachers.filter((teacher) => !getTeacherClass(teacher));
        } else if (replaceMode === "swap") {
            // Swap: only show teachers WITH a class (can exchange)
            return otherTeachers.filter((teacher) => getTeacherClass(teacher));
        }
        return otherTeachers;
    }, [replaceModalClass, teachers, replaceMode]);
    const selectedReplacementTeacher = React.useMemo(
        () => replacementCandidates.find((teacher) => String(teacher._id) === String(replacementTeacherId)) || null,
        [replacementCandidates, replacementTeacherId]
    );
    const selectedReplacementPrimaryClass = React.useMemo(() => {
        if (!selectedReplacementTeacher?.profile) return null;
        // Prefer classTeacherOf (explicit class teacher assignment),
        // fall back to assignedClasses[0] for compatibility
        const classTeacherOf = selectedReplacementTeacher.profile.classTeacherOf;
        if (classTeacherOf?.standard && classTeacherOf?.section) {
            return classTeacherOf;
        }
        return selectedReplacementTeacher.profile.assignedClasses?.[0] || null;
    }, [selectedReplacementTeacher]);
    const openReplaceModal = (group) => {
        setReplaceModalClass(group);
        setReplacementTeacherId("");
        setReplaceMode("replace");
        setReplaceError("");
    };

    const closeReplaceModal = () => {
        setReplaceModalClass(null);
        setReplacementTeacherId("");
        setReplaceMode("replace");
        setReplaceError("");
    };

    const handleReplaceTeacher = async () => {
        if (!replaceModalClass || !replacementTeacherId || !onReplaceClassTeacher) return;

        try {
            setReplaceError("");
            await onReplaceClassTeacher({
                standard: replaceModalClass.standard,
                section: replaceModalClass.section,
                replacementTeacherId,
                mode: replaceMode,
            });
            closeReplaceModal();
        } catch (error) {
            setReplaceError(error?.response?.data?.error?.message || error?.response?.data?.message || "Failed to replace class teacher");
        }
    };


    if (Object.keys(groupedClasses).length === 0) {
        return <div className="text-center py-8 sm:py-16 text-muted-foreground font-medium">No classes match your search.</div>;
    }

    return (
        <div className="space-y-6">
            {Object.values(groupedClasses).map(group => {
                const isExpanded = isDetailView || expandedClasses[group.id];

                if (isDetailView) {
                    return (
                        <div key={group.id} className="space-y-4">
                            {/* Static Class Info Header */}
                            <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 border border-slate-100 shadow-sm hover:bg-slate-50 text-slate-400 hover:text-primary transition-all rounded-xl shrink-0"
                                        onClick={() => navigate(`${rolePath}/attendance`)}
                                    >
                                        <FaArrowLeft size={14} />
                                    </Button>

                                    <div className="flex items-center gap-4">
                                        <div className="min-w-[5rem] w-fit px-4 h-14 rounded-2xl bg-[#1a1a1a] text-white flex items-center justify-center shadow-md shrink-0">
                                            <span className="font-black text-2xl uppercase tracking-tighter">{`${group.standard}${group.section}`}</span>
                                        </div>

                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Class {group.id}</h2>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="bg-slate-100/80 text-slate-500 font-bold px-2 py-0.5 rounded-lg text-xs border-none uppercase tracking-wide">
                                                    {group.students.length} Students
                                                </Badge>
                                                <div className="h-3 w-[1.5px] bg-slate-200" />
                                                <span className="text-slate-400 text-xs font-bold tracking-tight uppercase">Academic Session 2025-26</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 p-2.5 pl-3 pr-6 rounded-2xl border border-slate-100 flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-primary">
                                        <FaUserTie size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-tight mb-0.5">Class Teacher</p>
                                        <p className="text-base font-black text-slate-900 leading-tight tracking-tight">{formatValue(group.teacher?.name)}</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="ml-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
                                        onClick={() => openReplaceModal(group)}
                                    >
                                        <FaExchangeAlt className="mr-2" size={12} />
                                        Replace
                                    </Button>
                                </div>
                            </div>

                            {/* Student List Content */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-6 border-b bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="relative w-full sm:w-96">
                                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <Input
                                            placeholder={`Search in Class ${group.id}...`}
                                            className="pl-11 h-12 bg-white border-slate-200 rounded-2xl shadow-none focus-visible:ring-primary/20"
                                            value={studentSearchQuery}
                                            onChange={(e) => {
                                                setStudentSearchQuery(e.target.value);
                                                setClassPage(group.id, 0);
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="px-3 py-1.5 rounded-xl border-slate-200 text-slate-500 font-bold bg-white">
                                            Sort by Roll No
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                                                <TableHead className="w-[80px] text-center font-bold text-slate-400 uppercase tracking-widest text-[10px] py-6">Pos</TableHead>
                                                <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px] py-6">Student Information</TableHead>
                                                <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px] py-6 text-center">Roll Number</TableHead>
                                                <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px] py-6 text-center">Status</TableHead>
                                                <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px] py-6 text-right pr-8">Mark Present</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.students
                                                .filter(s =>
                                                    !studentSearchQuery ||
                                                    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                                    s.email.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                                    (s.profile?.rollNumber && s.profile.rollNumber.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                                )
                                                .slice(getClassPage(group.id) * itemsPerPage, (getClassPage(group.id) + 1) * itemsPerPage).map((student, idx) => {
                                                    const status = getStudentStatus(student._id);
                                                    const isPresent = status === 'present';
                                                    const isMutating = manualMutation.isPending && manualMutation.variables?.studentId === student._id;
                                                    return (
                                                        <TableRow
                                                            key={student._id}
                                                            className="cursor-pointer group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0"
                                                            onClick={() => setSelectedStudent(student)}
                                                        >
                                                            <TableCell className="text-center font-bold text-slate-300">
                                                                {(getClassPage(group.id) * itemsPerPage) + idx + 1}
                                                            </TableCell>
                                                            <TableCell className="py-5">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-500 font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                                        {student.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-slate-900 group-hover:text-primary transition-colors">{student.name}</p>
                                                                        <p className="text-xs font-bold text-slate-400 tracking-tight">{student.email}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-black px-3 py-1 rounded-lg">{formatValue(student.profile?.rollNumber)}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant="outline" className={`font-black uppercase tracking-[0.1em] text-[10px] px-3 py-1.5 rounded-xl ${STATUS_STYLES[status]}`}>
                                                                    {STATUS_LABELS[status]}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex justify-end items-center">
                                                                    <Switch
                                                                        checked={isPresent}
                                                                        onCheckedChange={(val) => handleManualToggle(student._id, val)}
                                                                        disabled={isMutating}
                                                                        className={isPresent ? "data-[state=checked]:bg-emerald-500" : ""}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </div>

                                <PaginationControls
                                    currentPage={getClassPage(group.id)}
                                    totalItems={group.students.filter(s =>
                                        !studentSearchQuery ||
                                        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                        s.email.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                        (s.profile?.rollNumber && s.profile.rollNumber.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                    ).length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={(p) => setClassPage(group.id, p)}
                                    onPageSizeChange={onPageSizeChange}
                                />
                            </div>
                        </div>
                    );
                }

                // Standard List Item (Accordion-style for main list)
                return (
                    <Card
                        key={group.id}
                        id={`class-card-${group.id.replace(/\s+/g, '-')}`}
                        className={`overflow-hidden transition-all duration-300 border-slate-200 shadow-sm ${isExpanded ? 'ring-1 ring-primary/20' : 'hover:border-slate-300'}`}
                    >
                        <div
                            onClick={() => navigate(`${rolePath}/attendance/${encodeURIComponent(group.id)}`)}
                            className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer bg-white hover:bg-slate-50/50 transition-colors"
                        >
                            <div className="flex items-center gap-5 w-full md:w-auto">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 bg-[#1a1a1a]/20 blur-xl rounded-[1.25rem] pointer-events-none" />
                                    <div className="relative min-w-[5rem] w-fit px-4 h-14 rounded-[1.25rem] bg-[#1a1a1a] text-white flex items-center justify-center shadow-md">
                                        <span className="font-black text-2xl uppercase tracking-tighter">{`${group.standard}${group.section}`}</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold tracking-tight text-xl text-slate-900">Class {group.id}</h3>
                                    <p className="text-sm font-medium text-muted-foreground">{group.students.length} Students enrolled</p>
                                </div>
                            </div>

                            <div className="flex items-center w-full md:w-auto justify-between md:justify-end gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                        <FaUserTie className="text-slate-500" />
                                    </div>
                                    <div className="text-sm hidden sm:block">
                                        <p className="font-bold text-slate-900">{formatValue(group.teacher?.name)}</p>
                                        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">Class Teacher</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
            {replaceModalClass && (
                <div className="modal-overlay fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-5">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Replace Class Teacher</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Class {replaceModalClass.id} currently has <span className="font-semibold text-slate-700">{formatValue(replaceModalClass.teacher?.name)}</span> as class teacher.
                        </p>
                        {replaceError && (
                            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                {replaceError}
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Action
                            </label>
                            <select
                                value={replaceMode}
                                onChange={(event) => {
                                    setReplaceMode(event.target.value);
                                    setReplacementTeacherId(""); // Reset selection when mode changes
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                                style={{ colorScheme: 'light' }}
                            >
                                <option value="replace">Replace (assign unassigned teacher)</option>
                                {replaceModalClass?.teacher && (
                                    <option value="swap">Swap with another class teacher</option>
                                )}
                            </select>
                            <p className="mt-2 text-xs text-slate-500">
                                {replaceMode === "replace"
                                    ? "Select a teacher who is not currently a class teacher."
                                    : "Select a teacher to exchange classes with."}
                            </p>
                        </div>
                        <div className="mt-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                {replaceMode === "replace" ? "New Class Teacher (Unassigned)" : "Swap With Class Teacher"}
                            </label>
                            <select
                                value={replacementTeacherId}
                                onChange={(event) => setReplacementTeacherId(event.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                                style={{ colorScheme: 'light' }}
                            >
                                <option value="">
                                    {replaceMode === "replace" ? "Select unassigned teacher" : "Select class teacher to swap with"}
                                </option>
                                {replacementCandidates.map((teacher) => {
                                    const teacherClass = getTeacherClass(teacher);
                                    return (
                                        <option key={teacher._id} value={teacher._id}>
                                            {teacher.name} {teacherClass ? `(${teacherClass.standard}-${teacherClass.section})` : "(Unassigned)"}
                                        </option>
                                    );
                                })}
                            </select>
                            {replacementCandidates.length === 0 && (
                                <p className="mt-2 text-xs text-amber-600">
                                    {replaceMode === "replace"
                                        ? "No unassigned teachers available. All teachers are already class teachers. Use Swap instead."
                                        : "No other class teachers available to swap with."}
                                </p>
                            )}
                        </div>
                        {selectedReplacementPrimaryClass && replaceMode === "swap" && (
                            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                This will swap classes: <strong>{replaceModalClass.teacher?.name}</strong> will move to class {selectedReplacementPrimaryClass.standard}-{selectedReplacementPrimaryClass.section}, and <strong>{selectedReplacementTeacher?.name}</strong> will become class teacher of {replaceModalClass.id}.
                            </div>
                        )}
                        <div className="mt-5 flex items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closeReplaceModal}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleReplaceTeacher}
                                disabled={!replacementTeacherId || replaceTeacherPending}
                            >
                                {replaceTeacherPending ? "Replacing..." : "Replace Teacher"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminClassList;
