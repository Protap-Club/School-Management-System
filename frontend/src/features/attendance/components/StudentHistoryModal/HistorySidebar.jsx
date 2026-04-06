import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaClock } from 'react-icons/fa';
import { STATUS_CONFIG } from './AttendanceCalendar';

export const STAT_CARDS = [
    { key: 'present', label: 'Present', ...STATUS_CONFIG.present },
    { key: 'absent', label: 'Absent', ...STATUS_CONFIG.absent },
];

const HistorySidebar = ({ stats, selectedDay }) => {
    // If original status was 'late', show it as 'present' in the details
    const displayStatus = selectedDay?.status === 'late' ? 'present' : selectedDay?.status;
    const config = displayStatus ? STATUS_CONFIG[displayStatus] : null;

    return (
        <div className="w-full lg:w-[280px] p-5 lg:p-6 bg-slate-50/40 border-l border-slate-100 overflow-y-auto shrink-0 flex flex-col gap-6">
            <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 px-1">Statistics</h4>
                <div className="space-y-4">
                    {STAT_CARDS.map(({ key, label, icon, iconBg, textColor }) => (
                        <div key={key} className="relative group/card">
                            <Card className="relative overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl rounded-[24px] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 ring-1 ring-slate-200/50">
                                <div className={`absolute top-0 right-0 w-20 h-20 ${iconBg} rounded-full blur-3xl -mr-6 -mt-6 opacity-40 group-hover/card:opacity-60 transition-opacity duration-500 pointer-events-none`} />
                                <CardContent className="p-4 relative z-10 flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] ring-1 ring-black/5 transform group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500`}>
                                        {React.cloneElement(icon, { size: 18 })}
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                                        <p className={`text-2xl font-black tracking-tight ${textColor} leading-none`}>{stats[key]}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>

            {selectedDay ? (
                <div className="relative group/detail mt-0">
                    <Card className={`relative overflow-hidden border-0 shadow-[0_15px_35px_rgba(0,0,0,0.08)] rounded-[24px] transition-all duration-500 ring-1 ring-black/5 ${config?.light || 'bg-slate-50'}`}>
                        <div className={`absolute top-0 right-0 w-24 h-24 ${config?.legendColor || 'bg-slate-200'} rounded-full blur-3xl -mr-8 -mt-8 opacity-20 pointer-events-none`} />
                        <CardHeader className="p-4 pb-1.5 relative z-10">
                            <CardTitle className="text-[10px] font-black text-slate-500/60 uppercase tracking-[0.2em]">Day Insight</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1.5 space-y-3 relative z-10">
                            <div className="flex items-center gap-3.5">
                                <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shadow-md transform group-hover/detail:scale-110 transition-all duration-500 ${config?.color}`}>
                                    {config?.icon && React.cloneElement(config.icon, { className: "text-white w-4 h-4", size: 16 })}
                                </div>
                                <div>
                                    <span className={`block text-base font-black capitalize tracking-tight ${config?.textColor || 'text-slate-900'}`}>{displayStatus}</span>
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                        {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.02)] ring-1 ring-black/5 space-y-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-slate-100/80 flex items-center justify-center">
                                        <FaClock className="text-slate-400 w-3 h-3" />
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Check-in</span>
                                        <span className="block text-xs font-black text-slate-900 leading-none">{selectedDay.checkIn || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[40px] bg-white/40 p-10 text-center mt-2 group/empty hover:bg-white/60 transition-all duration-500">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 group-hover/empty:scale-110 group-hover/empty:rotate-12 transition-all duration-700 shadow-inner">
                        <FaClock className="text-slate-300 w-8 h-8" />
                    </div>
                    <p className="text-[13px] font-bold text-slate-400 text-balance leading-relaxed px-2 tracking-tight">Tap any day to see<br/>detailed analytics</p>
                </div>
            )}
        </div>
    );
};

export default HistorySidebar;
