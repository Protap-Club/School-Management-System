// Attendance Page — Teacher/Admin view for daily attendance with manual toggle.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../features/auth';
import { useFeatures } from '../../state';
import { connectSocket, disconnectSocket } from '../../api/socket';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';
import {
    useStudents,
    useTeachers,
    useTodayAttendance,
    useMarkManualAttendance,
    useReplaceClassTeacher,
} from './index';
import { formatValue } from '../../utils';

// Components
import StudentHistoryModal from './components/StudentHistoryModal';
import { AttendanceStatCards } from './components/AttendanceStatCards';
import AdminClassList from './components/AdminClassList';
import TeacherStudentList from './components/TeacherStudentList';
import { PaginationControls } from '../../components/ui/PaginationControls';

// Icons & UI
import { FaCalendarAlt, FaUsers, FaCheckCircle, FaTimesCircle, FaSearch, FaWifi, FaClipboardList } from 'react-icons/fa';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ─── Constants ──────────────────────────────────────────
const STATUS_STYLES = {
    present: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    late: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    absent: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
    unmarked: 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200',
};
const STATUS_LABELS = { present: 'Present', late: 'Late', absent: 'Absent', unmarked: 'Unmarked' };
// const ITEMS_PER_PAGE = 25; // Removed in favor of dynamic state

// ─── Helpers ────────────────────────────────────────────
const buildAttendanceMap = (records = []) => {
    const map = {};
    records.forEach(record => { map[record.studentId] = { status: record.status.toLowerCase(), checkInTime: record.checkInTime }; });
    return map;
};

const buildClassGroups = (students = [], teachers = [], configuredClassSections = []) => {
    const groups = {};
    const configuredKeys = new Set(
        configuredClassSections.map((item) => `${item.standard} ${item.section}`.trim())
    );
    const primaryClassTeacherByClass = {};

    teachers.forEach((teacher) => {
        const primaryClass = teacher.profile?.assignedClasses?.[0];
        if (!primaryClass?.standard || !primaryClass?.section) return;

        const key = `${primaryClass.standard} ${primaryClass.section}`.trim();
        const existingTeacher = primaryClassTeacherByClass[key];

        if (!existingTeacher) {
            primaryClassTeacherByClass[key] = teacher;
            return;
        }

        const existingTs = new Date(existingTeacher.profile?.updatedAt || existingTeacher.updatedAt || 0).getTime();
        const nextTs = new Date(teacher.profile?.updatedAt || teacher.updatedAt || 0).getTime();
        if (nextTs >= existingTs) {
            primaryClassTeacherByClass[key] = teacher;
        }
    });

    configuredClassSections.forEach((item) => {
        const key = `${item.standard} ${item.section}`.trim();
        const classTeacher = primaryClassTeacherByClass[key] || null;
        groups[key] = { id: key, standard: item.standard, section: item.section, teacher: classTeacher || null, students: [] };
    });

    students.forEach(student => {
        // Hide "Unassigned" class by skipping students without a assigned standard
        if (!student.profile?.standard) return;

        const std = student.profile.standard;
        const sec = student.profile?.section || '';
        const key = `${std} ${sec}`.trim();
        if (configuredKeys.size > 0 && !configuredKeys.has(key)) return;
        if (!groups[key]) {
            const classTeacher = primaryClassTeacherByClass[key] || null;
            groups[key] = { id: key, standard: std, section: sec, teacher: classTeacher || null, students: [] };
        }
        groups[key].students.push(student);
    });

    // Sort students by roll number within each group
    Object.values(groups).forEach(group => {
        group.students.sort((a, b) => {
            const rollA = a.profile?.rollNumber || '';
            const rollB = b.profile?.rollNumber || '';
            return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
        });
    });

    return Object.keys(groups).sort((a, b) => {
        const [stdA, secA = ''] = a.split(' ');
        const [stdB, secB = ''] = b.split(' ');

        if (stdA === 'Unassigned') return 1;
        if (stdB === 'Unassigned') return -1;

        return Number(stdA) - Number(stdB) || secA.localeCompare(secB);
    }).reduce((acc, k) => { acc[k] = groups[k]; return acc; }, {});
};

// ─── Main Page ──────────────────────────────────────────
const AttendancePage = () => {
    const { user: currentUser } = useAuth();
    const { hasFeature, loading: featuresLoading } = useFeatures();
    const isAdmin = ['admin', 'super_admin'].includes(currentUser?.role);

    // Queries & Mutations
    const { data: studentsRes, isLoading: studentsLoading } = useStudents();
    const { data: teachersRes, isLoading: teachersLoading } = useTeachers(isAdmin);
    const { data: attendanceRes, isLoading: attendanceLoading } = useTodayAttendance();
    const manualMutation = useMarkManualAttendance();
    const replaceTeacherMutation = useReplaceClassTeacher();
    const { classSections: configuredClassSections } = useSchoolClasses({ enabled: isAdmin });

    // UI State
    const [socketConnected, setSocketConnected] = useState(false);
    const [expandedClasses, setExpandedClasses] = useState({});
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [teacherPage, setTeacherPage] = useState(0);
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('attendance_pageSize');
        return saved ? parseInt(saved, 10) : 25;
    });
    const handlePageSizeChange = (size) => {
        setPageSize(size);
        localStorage.setItem('attendance_pageSize', size);
        setTeacherPage(0);
        setStatsModalPage(0);
        // Also reset all class pages
        setClassPages({});
    };
    const [classPages, setClassPages] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [classSearchQuery, setClassSearchQuery] = useState("");
    const { classId } = useParams();
    const navigate = useNavigate();

    const [showModalType, setShowModalType] = useState(null); // 'present' | 'absent'
    const [statsModalSearch, setStatsModalSearch] = useState('');
    const [statsModalPage, setStatsModalPage] = useState(0);

    const getClassPage = (classId) => classPages[classId] || 0;
    const setClassPage = (classId, page) => setClassPages(prev => ({ ...prev, [classId]: page }));

    const isLoading = studentsLoading || attendanceLoading || (isAdmin && teachersLoading);

    // Derived Data
    const students = useMemo(() => studentsRes?.data?.users || [], [studentsRes]);
    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        const q = searchQuery.toLowerCase();
        return students.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.profile?.rollNumber?.includes(q));
    }, [students, searchQuery]);
    const teachers = useMemo(() => teachersRes?.data?.users || [], [teachersRes]);
    const attendanceRecords = useMemo(() => attendanceRes?.data || [], [attendanceRes]);
    const attendanceMap = useMemo(() => buildAttendanceMap(attendanceRecords), [attendanceRecords]);

    const allGroupedClasses = useMemo(
        () => isAdmin ? buildClassGroups(filteredStudents, teachers, configuredClassSections) : {},
        [configuredClassSections, filteredStudents, isAdmin, teachers]
    );

    const groupedClasses = useMemo(() => {
        if (!isAdmin) return {};
        let classes = { ...allGroupedClasses };

        // Filter by classId from URL if present
        if (classId) {
            const decodedClassId = decodeURIComponent(classId).toLowerCase().replace(/\s+/g, ' ').trim();
            const matchingKey = Object.keys(classes).find(k => k.toLowerCase().replace(/\s+/g, ' ').trim() === decodedClassId);
            if (matchingKey) {
                return { [matchingKey]: classes[matchingKey] };
            }
            return {}; // If classId in URL is invalid
        }

        // Otherwise filter by classSearchQuery
        if (classSearchQuery) {
            const q = classSearchQuery.toLowerCase();
            const filtered = {};
            Object.keys(classes).forEach(id => {
                if (id.toLowerCase().includes(q)) {
                    filtered[id] = classes[id];
                }
            });
            return filtered;
        }

        return classes;
    }, [isAdmin, allGroupedClasses, classId, classSearchQuery]);

    const statsStudents = useMemo(() => {
        if (isAdmin && classId) {
            const activeClassGroup = Object.values(groupedClasses)[0];
            return activeClassGroup?.students || [];
        }
        return students;
    }, [isAdmin, classId, groupedClasses, students]);

    const statsData = useMemo(() => {
        const presentStudents = [];
        const absentStudents = [];
        let total = statsStudents.length;

        statsStudents.forEach(s => {
            const status = attendanceMap[s._id]?.status;
            if (status === 'present' || status === 'late') {
                presentStudents.push({ ...s, checkInTime: attendanceMap[s._id]?.checkInTime });
            } else {
                absentStudents.push(s);
            }
        });

        // Ensure we handle students properly based on backend return
        return {
            total,
            present: presentStudents.length,
            absent: absentStudents.length,
            presentList: presentStudents,
            absentList: absentStudents
        };
    }, [statsStudents, attendanceMap]);

    const STAT_CARDS_CONFIG = useMemo(() => [
        { label: 'Total Students', key: 'total', color: 'text-blue-600', bg: 'bg-blue-100', onClick: null },
        { label: 'Present Today', key: 'present', color: 'text-emerald-600', bg: 'bg-emerald-100', onClick: () => { setShowModalType('present'); setStatsModalPage(0); setStatsModalSearch(''); } },
        { label: 'Absent Today', key: 'absent', color: 'text-rose-600', bg: 'bg-rose-100', onClick: () => { setShowModalType('absent'); setStatsModalPage(0); setStatsModalSearch(''); } },
    ], []);

    const today = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);

    const getStudentStatus = useCallback((studentId) => attendanceMap[studentId]?.status || 'unmarked', [attendanceMap]);

    const handleManualToggle = useCallback((studentId, currentVal) => {
        const newStatus = currentVal ? 'Present' : 'Absent';
        manualMutation.mutate({ studentId, status: newStatus });
    }, [manualMutation]);

    const [searchParams] = useSearchParams();
    const classParam = searchParams.get('class');

    useEffect(() => {
        setTeacherPage(0);
    }, [searchQuery]);

    useEffect(() => {
        const show = searchParams.get('show');
        if (show === 'present') {
            setShowModalType('present');
            setStatsModalPage(0);
            setStatsModalSearch('');
        } else if (show === 'absent') {
            setShowModalType('absent');
            setStatsModalPage(0);
            setStatsModalSearch('');
        }
    }, [searchParams]);

    useEffect(() => {
        if (classId) {
            window.scrollTo(0, 0); // Immediate jump
            const decodedClassId = decodeURIComponent(classId);
            setExpandedClasses(prev => ({ ...prev, [decodedClassId]: true }));
        } else if (classParam && groupedClasses[classParam]) {
            setExpandedClasses(prev => ({ ...prev, [classParam]: true }));
            // Optional: Scroll to the expanded class at the top of the viewport
            setTimeout(() => {
                const element = document.getElementById(`class-card-${classParam.replace(/\s+/g, '-')}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }, 10); // Faster timeout
        }
    }, [classId, classParam, groupedClasses]);

    useEffect(() => {
        const socket = connectSocket(currentUser?.schoolId);
        socket.on('connect', () => setSocketConnected(true));
        socket.on('disconnect', () => setSocketConnected(false));
        return () => disconnectSocket();
    }, [currentUser?.schoolId]);

    // ─── Access Guards ──────────────────────────────────
    if (!featuresLoading && !hasFeature('attendance')) return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6"><FaClipboardList className="text-slate-400" size={40} /></div>
                <h2 className="text-3xl font-black tracking-tight text-foreground">Feature Disabled</h2>
                <p className="text-muted-foreground mt-2 max-w-sm">The Attendance module has not been activated for your school.</p>
            </div>
        </DashboardLayout>
    );

    // ─── Render ─────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(`/${currentUser?.role === 'super_admin' ? 'superadmin' : 'admin'}/attendance`)}
                                className="page-title hover:text-primary transition-colors text-left"
                            >
                                Attendance
                            </button>
                            {classId && (
                                <>
                                    <span className="text-2xl font-light text-slate-300">/</span>
                                    <span className="text-xl font-semibold bg-primary/10 text-primary px-4 py-1 rounded-2xl">Class {decodeURIComponent(classId)}</span>
                                </>
                            )}
                            <Badge variant={socketConnected ? "default" : "secondary"} className={`rounded-full px-3 py-1 animate-in fade-in ${socketConnected ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                                <FaWifi className="mr-2 w-3 h-3" />
                                {socketConnected ? 'Live' : 'Connecting'}
                            </Badge>
                        </div>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <FaCalendarAlt className="text-primary w-4 h-4" />
                            {today}
                        </p>
                    </div>
                    {isAdmin && !classId && (
                        <div className="relative w-full md:w-80">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <Input
                                placeholder="Search classes (e.g. 10 A)..."
                                className="pl-9 bg-white shadow-sm border-slate-200 focus:ring-primary/20"
                                value={classSearchQuery}
                                onChange={(e) => setClassSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                    {!isAdmin && (
                        <div className="relative w-full md:w-80">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <Input placeholder="Search by name, email, or roll..." className="pl-9 bg-white shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                    )}
                </div>

                {/* Stats */}
                <AttendanceStatCards stats={statsData} statCardsConfig={STAT_CARDS_CONFIG} isLoading={isLoading} />

                {/* Main Content */}
                {isLoading ? (
                    <Card className="border-dashed border-2 shadow-none">
                        <CardContent className="h-[400px] flex flex-col justify-center items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary shadow-sm mb-4"></div>
                            <p className="font-medium text-muted-foreground animate-pulse">Syncing attendance records...</p>
                        </CardContent>
                    </Card>
                ) : isAdmin ? (
                    <AdminClassList
                        groupedClasses={groupedClasses} expandedClasses={expandedClasses} setExpandedClasses={setExpandedClasses}
                        getClassPage={getClassPage} setClassPage={setClassPage} itemsPerPage={pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        setSelectedStudent={setSelectedStudent} getStudentStatus={getStudentStatus}
                        STATUS_STYLES={STATUS_STYLES} STATUS_LABELS={STATUS_LABELS}
                        handleManualToggle={handleManualToggle} manualMutation={manualMutation}
                        teachers={teachers}
                        onReplaceClassTeacher={(payload) => replaceTeacherMutation.mutateAsync(payload)}
                        replaceTeacherPending={replaceTeacherMutation.isPending}
                    />
                ) : (
                    <TeacherStudentList
                        filteredStudents={filteredStudents} teacherPage={teacherPage} setTeacherPage={setTeacherPage}
                        itemsPerPage={pageSize} onPageSizeChange={handlePageSizeChange}
                        getStudentStatus={getStudentStatus} handleManualToggle={handleManualToggle}
                        manualMutation={manualMutation} setSelectedStudent={setSelectedStudent}
                        STATUS_STYLES={STATUS_STYLES} STATUS_LABELS={STATUS_LABELS}
                    />
                )}

                <StudentHistoryModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />

                {/* Present/Absent Students List Modal */}
                {showModalType && (
                    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showModalType === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {showModalType === 'present' ? <FaCheckCircle size={20} /> : <FaTimesCircle size={20} />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 capitalize">{showModalType} Today</h2>
                                        <p className="text-sm font-medium text-slate-500">
                                            {showModalType === 'present' ? statsData.presentList.length : statsData.absentList.length} students {showModalType}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModalType(null)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100/50 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                                    <FaTimesCircle size={24} />
                                </button>
                            </div>

                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <Input
                                        placeholder={`Search ${showModalType} students...`}
                                        className="pl-9 bg-white"
                                        value={statsModalSearch}
                                        onChange={(e) => { setStatsModalSearch(e.target.value); setStatsModalPage(0); }}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 bg-slate-50/30">
                                {(() => {
                                    const baseList = showModalType === 'present' ? statsData.presentList : statsData.absentList;
                                    const filteredList = baseList.filter(s =>
                                        !statsModalSearch ||
                                        s.name.toLowerCase().includes(statsModalSearch.toLowerCase()) ||
                                        s.profile?.rollNumber?.toLowerCase().includes(statsModalSearch.toLowerCase())
                                    );
                                    const modalTotalPages = Math.ceil(filteredList.length / pageSize);
                                    const paginatedList = filteredList.slice(statsModalPage * pageSize, (statsModalPage + 1) * pageSize);

                                    if (paginatedList.length === 0) {
                                        return (
                                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                                    <FaUsers size={28} />
                                                </div>
                                                <p className="text-slate-400 font-medium">No students found.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="flex flex-col h-full">
                                            <div className="divide-y divide-slate-50 flex-1">
                                                {paginatedList.map(student => (
                                                    <div key={student._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white hover:bg-slate-50/80 transition-all rounded-xl mx-2 my-2 cursor-pointer shadow-sm border border-slate-100" onClick={() => { setShowModalType(null); setSelectedStudent(student); }}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg hidden sm:flex">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-slate-800">{student.name}</h3>
                                                                <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-500">
                                                                    <span className="bg-slate-100 px-2.5 py-0.5 flex items-center rounded-md">Roll: {formatValue(student.profile?.rollNumber)}</span>
                                                                    {student.profile?.standard && (
                                                                        <span className="bg-slate-100 px-2.5 py-0.5 flex items-center rounded-md text-primary font-semibold">Class {student.profile.standard} {student.profile.section}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {showModalType === 'present' && student.checkInTime && (
                                                            <div className="flex items-center gap-2 self-start sm:self-center">
                                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                                                                    {new Date(student.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {modalTotalPages > 0 && (
                                                <PaginationControls
                                                    currentPage={statsModalPage}
                                                    totalItems={filteredList.length}
                                                    itemsPerPage={pageSize}
                                                    onPageChange={setStatsModalPage}
                                                    onPageSizeChange={handlePageSizeChange}
                                                />
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AttendancePage;
