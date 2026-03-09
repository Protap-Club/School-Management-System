import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaClock } from 'react-icons/fa';
import { STATUS_CONFIG } from './AttendanceCalendar';

export const STAT_CARDS = [
    { key: 'present', label: 'Present', ...STATUS_CONFIG.present },
    { key: 'late', label: 'Late', ...STATUS_CONFIG.late },
    { key: 'absent', label: 'Absent', ...STATUS_CONFIG.absent },
];

const HistorySidebar = ({ stats, selectedDay }) => {
    return (
        <div className="w-full lg:w-[260px] p-4 lg:p-5 bg-slate-50/50 overflow-y-auto shrink-0 flex flex-col gap-4">
            <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Summary</h4>
                <div className="space-y-3">
                    {STAT_CARDS.map(({ key, label, icon, iconBg, textColor }) => (
                        <div key={key} className="relative group">
                            <Card className="relative overflow-hidden border-0 shadow-lg shadow-slate-200/40 bg-white/90 backdrop-blur-xl rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 ring-1 ring-slate-900/5">
                                <div className={`absolute top-0 right-0 w-16 h-16 ${iconBg} rounded-full blur-2xl -mr-4 -mt-4 opacity-50 pointer-events-none group-hover:opacity-80 transition-opacity duration-300`} />
                                <CardContent className="p-3 relative z-10 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shadow-inner ring-1 ring-black/5 transform group-hover:scale-105 group-hover:rotate-[3deg] transition-all duration-300`}>
                                        {React.cloneElement(icon, { size: 14 })}
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest drop-shadow-sm">{label}</p>
                                        <p className={`text-xl font-black tracking-tighter ${textColor} drop-shadow-sm leading-none`}>{stats[key]}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>

            {selectedDay ? (
                <div className="relative group mt-2">
                    <Card className={`relative overflow-hidden border-0 shadow-xl rounded-2xl transition-all ring-1 ring-black/5 ${STATUS_CONFIG[selectedDay.status]?.light || 'bg-slate-50'}`}>
                        <div className={`absolute top-0 right-0 w-20 h-20 ${STATUS_CONFIG[selectedDay.status]?.legendColor || 'bg-slate-200'} rounded-full blur-2xl -mr-6 -mt-6 opacity-20 pointer-events-none`} />
                        <CardHeader className="p-4 pb-1 relative z-10">
                            <CardTitle className="text-[10px] font-black text-slate-500/80 uppercase tracking-widest">Day Details</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 space-y-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transform hover:scale-105 transition-transform ${STATUS_CONFIG[selectedDay.status]?.color}`}>
                                    {React.cloneElement(STATUS_CONFIG[selectedDay.status]?.icon, { className: "text-white w-3.5 h-3.5", size: 14 })}
                                </div>
                                <div>
                                    <span className={`block text-base font-black capitalize tracking-tight drop-shadow-sm ${STATUS_CONFIG[selectedDay.status]?.textColor || 'text-slate-900'}`}>{selectedDay.status}</span>
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                        {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            {selectedDay.checkIn !== '-' && (
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white/90 backdrop-blur-md p-2.5 rounded-xl border border-white shadow-sm ring-1 ring-black/5">
                                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                                        <FaClock className="text-slate-400 w-3 h-3" />
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Check-in</span>
                                        <span className="block text-sm font-black text-slate-900 leading-none">{selectedDay.checkIn}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50 p-10 text-center mt-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FaClock className="text-slate-300 w-6 h-6" />
                    </div>
                    <p className="text-base font-bold text-slate-400 text-balance leading-relaxed">Select a day on the calendar to view detailed check-in records.</p>
                </div>
            )}
        </div>
    );
};

export default HistorySidebar;
