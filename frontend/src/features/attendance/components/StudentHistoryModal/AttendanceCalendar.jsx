import React, { useMemo } from 'react';
import { FaChevronLeft, FaChevronRight, FaCheck, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const STATUS_CONFIG = {
    present: { color: 'bg-emerald-500 text-white', light: 'bg-emerald-50 border-emerald-200', icon: <FaCheck className="text-emerald-600" />, iconBg: 'bg-emerald-100', textColor: 'text-emerald-600', legendColor: 'bg-emerald-500' },
    absent: { color: 'bg-red-500 text-white', light: 'bg-red-50 border-red-200', icon: <FaTimesCircle className="text-red-600" />, iconBg: 'bg-red-100', textColor: 'text-red-600', legendColor: 'bg-red-500' },
    late: { color: 'bg-amber-500 text-white', light: 'bg-amber-50 border-amber-200', icon: <FaExclamationTriangle className="text-amber-600" />, iconBg: 'bg-amber-100', textColor: 'text-amber-600', legendColor: 'bg-amber-500' },
};
export const LEGEND_ITEMS = [
    { label: 'Present', color: 'bg-emerald-500' },
    { label: 'Late', color: 'bg-amber-500' },
    { label: 'Absent', color: 'bg-red-500' },
    { label: 'No Data', color: 'bg-gray-200' },
];

const AttendanceCalendar = ({ history, currentDate, setCurrentDate, setSelectedDay, todayObj }) => {
    const attendanceByDate = useMemo(() => Object.fromEntries(history.map(r => [r.date, r])), [history]);
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
                className={`h-12 lg:h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                    ${cfg ? 'cursor-pointer hover:scale-105 hover:shadow-lg ' + cfg.color : ''}
                    ${!record && !isFuture && !isWeekend ? 'bg-slate-100 text-slate-400' : ''}
                    ${isFuture || (isWeekend && !record) ? 'bg-slate-50 text-slate-300 cursor-default' : ''}
                    ${isToday && !record ? 'ring-2 ring-primary ring-offset-2' : ''}
                    ${isToday && record ? 'ring-2 ring-white ring-offset-2 ring-offset-primary' : ''}`}
                title={record ? `${record.status} - ${record.checkIn}` : isWeekend ? 'Weekend' : isFuture ? 'Future' : 'No data'}>
                <span>{day}</span>
                {record && <div className="w-2 h-2 rounded-full bg-white/90 shadow-sm" />}
            </button>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-border bg-white">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <FaChevronLeft size={14} />
                </button>
                <span className="text-lg font-bold text-slate-900 tracking-tight">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={nextMonth}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) > todayObj}>
                    <FaChevronRight size={14} />
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
