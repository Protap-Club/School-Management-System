import React, { useMemo } from 'react';
import { FaChevronLeft, FaChevronRight, FaCheck, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const STATUS_CONFIG = {
    present: { color: 'bg-emerald-500 text-white', light: 'bg-emerald-50 border-emerald-200', icon: <FaCheck className="text-emerald-600" />, iconBg: 'bg-emerald-100', textColor: 'text-emerald-600', legendColor: 'bg-emerald-500' },
    absent: { color: 'bg-red-500 text-white', light: 'bg-red-50 border-red-200', icon: <FaTimesCircle className="text-red-600" />, iconBg: 'bg-red-100', textColor: 'text-red-600', legendColor: 'bg-red-500' },
};
export const LEGEND_ITEMS = [
    { label: 'Present', color: 'bg-emerald-500' },
    { label: 'Absent', color: 'bg-red-500' },
    { label: 'No Data', color: 'bg-gray-200' },
];

const AttendanceCalendar = ({ history, currentDate, setCurrentDate, setSelectedDay, todayObj }) => {
    const attendanceByDate = useMemo(() => {
        return Object.fromEntries(history.map(r => {
            // Map 'late' to 'present' for the UI
            const status = r.status === 'late' ? 'present' : r.status;
            return [r.date, { ...r, status }];
        }));
    }, [history]);
    const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const todayStr = formatDate(todayObj);

    const nextMonth = () => {
        const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        if (next <= todayObj) setCurrentDate(next);
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="h-12 lg:h-14 bg-slate-50/50 rounded-xl"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = formatDate(dateObj);
        const record = attendanceByDate[dateStr];
        const isToday = dateStr === todayStr;
        const isFuture = dateObj > todayObj;
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const cfg = record ? STATUS_CONFIG[record.status] : null;

        calendarDays.push(
            <button key={day} onClick={() => record && setSelectedDay(record)} disabled={!record}
                className={`h-12 lg:h-14 rounded-[18px] flex flex-col items-center justify-center gap-1.5 text-sm font-bold transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                    ${cfg ? 'cursor-pointer hover:scale-110 hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] ' + cfg.color : ''}
                    ${!record && !isFuture && !isWeekend ? 'bg-slate-100/80 text-slate-400' : ''}
                    ${isFuture || (isWeekend && !record) ? 'bg-slate-50/50 text-slate-200 cursor-default' : ''}
                    ${isToday && !record ? 'ring-2 ring-primary/50 ring-offset-4' : ''}
                    ${isToday && record ? 'ring-2 ring-white/50 ring-offset-4 ring-offset-primary/50' : ''}`}
                title={record ? `${record.status} - ${record.checkIn}` : isWeekend ? 'Weekend' : isFuture ? 'Future' : 'No data'}>
                <span className="drop-shadow-sm">{day}</span>
                {record && <div className="w-1.5 h-1.5 rounded-full bg-white/95 shadow-sm transform transition-transform group-hover:scale-125" />}
            </button>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-100 bg-white/80 backdrop-blur-sm relative">
            <div className="flex items-center justify-between mb-10">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all duration-300 border border-transparent hover:border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <FaChevronLeft size={16} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="w-8 h-1 bg-primary/20 rounded-full mt-1.5" />
                </div>
                <button onClick={nextMonth}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all duration-300 border border-transparent hover:border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-20 disabled:cursor-not-allowed"
                    disabled={new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) > todayObj}>
                    <FaChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-3 mb-4">
                {WEEKDAYS.map(day => (<div key={day} className="h-8 flex items-center justify-center text-xs font-black text-slate-400 uppercase tracking-widest">{day}</div>))}
            </div>

            <div className="grid grid-cols-7 gap-3">
                {calendarDays}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-slate-100">
                {LEGEND_ITEMS.map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <div className={`w-3 h-3 rounded-full ${color} shadow-sm`}></div>{label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AttendanceCalendar;
