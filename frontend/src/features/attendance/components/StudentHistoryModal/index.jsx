import React, { useState, useEffect } from 'react';
import { FaUserGraduate, FaIdCard, FaBuilding, FaLayerGroup } from 'react-icons/fa';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import AttendanceCalendar from './AttendanceCalendar';
import HistorySidebar from './HistorySidebar';

const StudentHistoryModal = ({ student, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
    const [selectedDay, setSelectedDay] = useState(null);
    const todayObj = new Date();

    useEffect(() => {
        if (student) generateMockHistory();
    }, [student]);

    const generateMockHistory = () => {
        const mockData = [];
        let present = 0, absent = 0, late = 0;

        for (let i = 0; i < 90; i++) {
            const date = new Date(todayObj);
            date.setDate(todayObj.getDate() - i);
            if (date.getDay() === 0 || date.getDay() === 6 || date > todayObj) continue;

            const r = Math.random();
            const status = r > 0.85 ? 'absent' : r > 0.75 ? 'late' : 'present';
            if (status === 'present') present++;
            if (status === 'absent') absent++;
            if (status === 'late') late++;

            let checkIn = '-';
            if (status === 'present') checkIn = `8:${(Math.floor(Math.random() * 20) + 20).toString().padStart(2, '0')} AM`;
            else if (status === 'late') checkIn = `9:${Math.floor(Math.random() * 30).toString().padStart(2, '0')} AM`;

            mockData.push({ date: date.toISOString().split('T')[0], status, checkIn });
        }
        setHistory(mockData);
        setStats({ present, absent, late, total: present + absent + late });
        setSelectedDay(null);
    };

    const attendancePercentage = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

    const profileBadges = [
        { icon: <FaIdCard className="text-blue-500 w-4 h-4" />, label: 'Roll:', value: student?.profile?.rollNumber },
        { icon: <FaBuilding className="text-purple-500 w-4 h-4" />, label: 'Class:', value: student?.profile?.standard },
        { icon: <FaLayerGroup className="text-orange-500 w-4 h-4" />, label: 'Section:', value: student?.profile?.section },
    ];

    return (
        <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl sm:max-w-5xl md:max-w-5xl lg:max-w-5xl w-[95vw] lg:w-[80vw] p-0 overflow-hidden gap-0 border-0 shadow-2xl rounded-3xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>Student Attendance History</DialogTitle>
                    <DialogDescription>View the past attendance records for {student?.name}</DialogDescription>
                </DialogHeader>

                {/* Hero */}
                <div className="bg-slate-900 border-b border-slate-800 p-5 lg:p-6 text-white shrink-0 relative overflow-hidden ">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl font-black border border-white/20 shadow-inner">
                                {student?.name?.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-50">{student?.name}</h2>
                                <p className="text-slate-400 text-sm font-medium mt-1">{student?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges Bar */}
                <div className="px-5 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4 bg-slate-50 border-b border-border shrink-0">
                    <div className="flex flex-wrap gap-2">
                        {profileBadges.map(({ icon, label, value }) => (
                            <Badge key={label} variant="outline" className="bg-white hover:bg-white border-slate-200 text-slate-600 px-3 py-1.5 flex items-center gap-2 font-medium">
                                {icon}<span className="text-slate-400">{label}</span>
                                <span className="text-slate-900">{value || '-'}</span>
                            </Badge>
                        ))}
                    </div>
                    <Badge variant={attendancePercentage >= 90 ? "default" : attendancePercentage >= 75 ? "secondary" : "destructive"}
                        className={`px-3 py-1 text-xs font-bold flex items-center gap-2 ${attendancePercentage >= 90 ? 'bg-emerald-500 hover:bg-emerald-600' : attendancePercentage >= 75 ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
                        <FaUserGraduate className="w-3.5 h-3.5" />
                        {attendancePercentage}% Attendance
                    </Badge>
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col lg:flex-row min-h-[400px] max-h-[75vh] overflow-y-auto lg:overflow-hidden">
                    <AttendanceCalendar
                        history={history}
                        currentDate={currentDate} setCurrentDate={setCurrentDate}
                        setSelectedDay={setSelectedDay} todayObj={todayObj}
                    />
                    <HistorySidebar
                        stats={stats}
                        selectedDay={selectedDay}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StudentHistoryModal;
