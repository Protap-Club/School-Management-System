import React from 'react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaChevronDown, FaUserTie, FaSearch } from 'react-icons/fa';
import PaginationControls from './PaginationControls';

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
    STATUS_LABELS
}) => {
    if (Object.keys(groupedClasses).length === 0) {
        return <div className="text-center py-16 text-muted-foreground font-medium">No classes match your search.</div>;
    }

    return (
        <div className="space-y-6">
            {Object.values(groupedClasses).map(group => {
                const isExpanded = expandedClasses[group.id];
                return (
                    <Card
                        key={group.id}
                        id={`class-card-${group.id.replace(/\s+/g, '-')}`}
                        className={`overflow-hidden transition-all duration-300 border-slate-200 shadow-sm ${isExpanded ? 'ring-1 ring-primary/20' : 'hover:border-slate-300'}`}
                    >
                        <div
                            onClick={() => setExpandedClasses(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                            className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer bg-white hover:bg-slate-50/50 transition-colors"
                        >
                            <div className="flex items-center gap-5 w-full md:w-auto">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 bg-[#1a1a1a]/20 blur-xl rounded-[1.25rem] pointer-events-none" />
                                    <div className="relative w-20 h-14 rounded-[1.25rem] bg-[#1a1a1a] text-white flex items-center justify-center gap-1.5 shadow-md">
                                        <span className="font-bold text-xl">{group.standard}</span>
                                        <span className="font-bold text-sm text-slate-400 mt-0.5">{group.section}</span>
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
                                        <p className="font-bold text-slate-900">{group.teacher?.name || 'Unassigned'}</p>
                                        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">Class Teacher</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-full">
                                    <FaChevronDown className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                </Button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
                                <div className="p-4 border-b bg-white">
                                    <div className="relative max-w-md">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                        <Input
                                            placeholder={`Search student in Class ${group.id}...`}
                                            className="pl-9 bg-slate-50 border-none shadow-none focus-visible:ring-1"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <Table className="bg-white">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                            <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12">Student</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12">Roll No</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12 text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.students.slice(getClassPage(group.id) * itemsPerPage, (getClassPage(group.id) + 1) * itemsPerPage).map(student => {
                                            const status = getStudentStatus(student._id);
                                            return (
                                                <TableRow key={student._id} className="cursor-pointer group hover:bg-slate-50" onClick={() => setSelectedStudent(student)}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{student.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-500">{student.profile?.rollNumber || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className={`font-bold uppercase tracking-wider text-[10px] ${STATUS_STYLES[status]}`}>
                                                            {STATUS_LABELS[status]}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                <div className="p-3 bg-white border-t">
                                    <PaginationControls currentPage={getClassPage(group.id)} totalItems={group.students.length} itemsPerPage={itemsPerPage} onPageChange={(p) => setClassPage(group.id, p)} />
                                </div>
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};

export default AdminClassList;
