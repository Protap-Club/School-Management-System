import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const AttendanceStatCards = ({ stats, statCardsConfig, isLoading }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statCardsConfig.map(({ icon: Icon, label, key, color, bg, onClick }) => (
                <Card
                    key={key}
                    className={`border border-slate-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] bg-white rounded-3xl transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5' : ''}`}
                    onClick={onClick}
                >
                    <CardContent className="p-6 sm:p-8 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">{label}</p>
                            <div className={`text-4xl sm:text-5xl font-black tracking-tight ${color}`}>
                                {isLoading ? <Skeleton className="h-10 w-16" /> : stats[key]}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
