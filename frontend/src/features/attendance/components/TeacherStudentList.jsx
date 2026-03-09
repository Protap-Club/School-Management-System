import React from 'react';
import { Card, CardTitle, CardHeader, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FaUserGraduate } from 'react-icons/fa';
import PaginationControls from './PaginationControls';

const TeacherStudentList = ({
    filteredStudents,
    teacherPage,
    setTeacherPage,
    itemsPerPage,
    getStudentStatus,
    handleManualToggle,
    manualMutation,
    setSelectedStudent,
    STATUS_STYLES,
    STATUS_LABELS
}) => {
    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                    <FaUserGraduate className="text-primary" />
                    My Assigned Students
                </CardTitle>
                <CardDescription>Click on any student to view their 90-day attendance history.</CardDescription>
            </CardHeader>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12">Student</TableHead>
                        <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12 hidden sm:table-cell">Email</TableHead>
                        <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12">Status</TableHead>
                        <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12 text-right">Mark Present</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredStudents.slice(teacherPage * itemsPerPage, (teacherPage + 1) * itemsPerPage).map(student => {
                        const status = getStudentStatus(student._id);
                        const isPresent = status === 'present';
                        const isMutating = manualMutation.isPending && manualMutation.variables?.studentId === student._id;

                        return (
                            <TableRow key={student._id} className="cursor-pointer group hover:bg-slate-50 transition-colors" onClick={() => setSelectedStudent(student)}>
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm shadow-sm transition-colors ${isPresent ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}>
                                            {student.name.charAt(0)}
                                        </div>
                                        <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{student.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-slate-500 hidden sm:table-cell">{student.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`font-bold uppercase tracking-wider text-[10px] ${STATUS_STYLES[status]}`}>
                                        {STATUS_LABELS[status]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end items-center mr-2">
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
            {filteredStudents.length === 0 && (
                <div className="text-center py-16 text-muted-foreground font-medium border-t">No students match your search.</div>
            )}
            {filteredStudents.length > 0 && (
                <div className="p-4 border-t bg-slate-50/50">
                    <PaginationControls currentPage={teacherPage} totalItems={filteredStudents.length} itemsPerPage={itemsPerPage} onPageChange={setTeacherPage} />
                </div>
            )}
        </Card>
    );
};

export default TeacherStudentList;
