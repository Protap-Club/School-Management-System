import React, { useState, useMemo } from 'react';
import { FaUserGraduate, FaIdCard, FaBuilding, FaLayerGroup } from 'react-icons/fa';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import AttendanceCalendar from './AttendanceCalendar';
import HistorySidebar from './HistorySidebar';
import { formatValue } from '../../../../utils';
import { useStudentHistory } from '../../index';

const StudentHistoryModal = ({ student, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const todayObj = new Date();

    const { data: historyData, isLoading, isError } = useStudentHistory(student?._id);

    // Map backend shape → shapes expected by AttendanceCalendar and HistorySidebar
    const { history, stats } = useMemo(() => {
        const calendar = historyData?.data?.calendar ?? [];
        const apiStats = historyData?.data?.stats;

        const history = calendar.map(r => ({
            date: typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0],
            // Normalise capitalised backend values to lowercase for calendar colouring
            status: r.status?.toLowerCase() ?? 'absent',
            checkIn: r.checkInTime
                ? new Date(r.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '-',
        }));

        const stats = apiStats
            ? { present: apiStats.totalPresent, absent: apiStats.totalAbsent, total: apiStats.totalDays }
            : { present: 0, absent: 0, total: 0 };

        return { history, stats };
    }, [historyData]);

    const attendancePercentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

    const profileBadges = [
        { icon: <FaIdCard className="text-blue-500 w-3.5 h-3.5" />, label: 'Roll:', value: student?.profile?.rollNumber },
        { icon: <FaBuilding className="text-purple-500 w-3.5 h-3.5" />, label: 'Class:', value: student?.profile?.standard },
        { icon: <FaLayerGroup className="text-orange-500 w-3.5 h-3.5" />, label: 'Section:', value: student?.profile?.section },
    ];

    return (
        <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl sm:max-w-4xl md:max-w-4xl lg:max-w-4xl w-[calc(100vw-2rem)] lg:w-[70vw] max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0 border-0 shadow-[0_30px_90px_rgba(0,0,0,0.3)] rounded-[32px] [&>button:last-child]:hidden outline-none">
                <DialogHeader className="sr-only">
                    <DialogTitle>Student Attendance History</DialogTitle>
                    <DialogDescription>View the past attendance records for {student?.name}</DialogDescription>
                </DialogHeader>

                {/* Hero Header */}
                <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border-b border-white/5 p-5 lg:p-7 text-white shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="relative group/avatar">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-indigo-500 rounded-3xl blur opacity-25 group-hover/avatar:opacity-50 transition duration-1000 group-hover/avatar:duration-200" />
                                <div className="relative w-16 h-16 bg-slate-800/50 backdrop-blur-xl rounded-[20px] flex items-center justify-center text-2xl font-black border border-white/10 shadow-2xl overflow-hidden">
                                    <span className="bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                                        {student?.name?.charAt(0)}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-sm leading-tight">{student?.name}</h2>
                                <div className="flex items-center gap-2 mt-1.5 px-3 py-0.5 bg-white/5 rounded-full border border-white/10 w-fit backdrop-blur-md">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                    <p className="text-slate-300 text-[12px] font-bold tracking-tight">{student?.email}</p>
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-[14px] bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-all duration-500 border border-white/10 hover:border-rose-500/30 group/close"
                            aria-label="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/close:rotate-90 transition-transform duration-500">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Status/Badges Bar */}
                <div className="px-5 lg:px-7 py-3 flex flex-wrap items-center justify-between gap-3 bg-white border-b border-slate-100 shrink-0">
                    <div className="flex flex-wrap gap-2.5">
                        {profileBadges.map(({ icon, label, value }) => (
                            <div key={label} className="bg-slate-50/80 border border-slate-200/60 text-slate-600 px-3.5 py-1.5 rounded-xl flex items-center gap-2 font-bold text-[12px] shadow-sm hover:shadow-md hover:bg-white transition-all duration-300 group/badge">
                                <div className="group-hover/badge:scale-110 transition-transform">{icon}</div>
                                <span className="text-slate-400 font-medium">{label}</span>
                                <span className="text-slate-900">{formatValue(value)}</span>
                            </div>
                        ))}
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl text-[12px] font-black tracking-tight flex items-center gap-2 shadow-sm border
                        ${attendancePercentage >= 90 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/20' : attendancePercentage >= 75 ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/20' : 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${attendancePercentage >= 90 ? 'bg-emerald-500' : attendancePercentage >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <FaUserGraduate className="w-3.5 h-3.5" />
                        {isLoading ? '—' : `${attendancePercentage}%`} Rate
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                <svg className="animate-spin w-8 h-8 text-primary/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <p className="text-sm font-semibold">Loading attendance history…</p>
                            </div>
                        </div>
                    ) : isError ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-rose-400 p-8 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <p className="text-sm font-bold">Failed to load history</p>
                                <p className="text-xs text-slate-400">Please close and try again.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto">
                                <AttendanceCalendar
                                    history={history}
                                    currentDate={currentDate} setCurrentDate={setCurrentDate}
                                    setSelectedDay={setSelectedDay} todayObj={todayObj}
                                />
                            </div>
                            <HistorySidebar
                                stats={stats}
                                selectedDay={selectedDay}
                            />
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StudentHistoryModal;

