import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../api/axios';
import { FaCheck, FaTimes, FaClock, FaCalendarAlt, FaSave } from 'react-icons/fa';

const AttendancePage = () => {
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchStudents = async () => {
        try {
            const response = await api.get('/attendance/students');
            if (response.data.success) {
                setStudents(response.data.data);
                // Initialize attendance state
                const initialAttendance = {};
                response.data.data.forEach(student => {
                    initialAttendance[student._id] = { status: 'present', remarks: '' };
                });
                setAttendance(initialAttendance);
            }
        } catch (error) {
            console.error('Failed to fetch students', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to fetch students' });
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingAttendance = async () => {
        try {
            const response = await api.get(`/attendance?date=${selectedDate}`);
            if (response.data.success && response.data.data.length > 0) {
                const existingAttendance = {};
                response.data.data.forEach(record => {
                    existingAttendance[record.studentId._id] = {
                        status: record.status,
                        remarks: record.remarks || ''
                    };
                });
                setAttendance(prev => ({ ...prev, ...existingAttendance }));
            }
        } catch (error) {
            console.error('Failed to fetch existing attendance', error);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        if (students.length > 0) {
            fetchExistingAttendance();
        }
    }, [selectedDate, students.length]);

    const handleStatusChange = (studentId, status) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleRemarksChange = (studentId, remarks) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], remarks }
        }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const attendanceData = Object.entries(attendance).map(([studentId, data]) => ({
                studentId,
                status: data.status,
                remarks: data.remarks
            }));

            const response = await api.post('/attendance/mark', {
                date: selectedDate,
                attendanceData
            });

            if (response.data.success) {
                setMessage({ type: 'success', text: `Attendance marked for ${response.data.data.saved} students` });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save attendance' });
        } finally {
            setSaving(false);
        }
    };

    const getStatusCounts = () => {
        const counts = { present: 0, absent: 0, late: 0 };
        Object.values(attendance).forEach(record => {
            counts[record.status]++;
        });
        return counts;
    };

    const counts = getStatusCounts();

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Attendance</h1>
                        <p className="text-gray-500 mt-1">Mark student attendance</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Date Picker */}
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                            <FaCalendarAlt className="text-gray-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="outline-none text-gray-700"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={saving || students.length === 0}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-indigo-600/30 transition-all font-medium disabled:opacity-50"
                        >
                            <FaSave />
                            {saving ? 'Saving...' : 'Save Attendance'}
                        </button>
                    </div>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-green-600">
                            <FaCheck />
                            <span className="text-2xl font-bold">{counts.present}</span>
                        </div>
                        <p className="text-green-600 text-sm mt-1">Present</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-red-600">
                            <FaTimes />
                            <span className="text-2xl font-bold">{counts.absent}</span>
                        </div>
                        <p className="text-red-600 text-sm mt-1">Absent</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-amber-600">
                            <FaClock />
                            <span className="text-2xl font-bold">{counts.late}</span>
                        </div>
                        <p className="text-amber-600 text-sm mt-1">Late</p>
                    </div>
                </div>

                {/* Students List */}
                {students.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center text-gray-500">
                        No students found in your institute
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Student</th>
                                    <th className="px-5 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((student, index) => (
                                    <tr key={student._id} className="hover:bg-gray-50/50">
                                        <td className="px-5 py-3 text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{student.name}</p>
                                                    <p className="text-xs text-gray-500">{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleStatusChange(student._id, 'present')}
                                                    className={`p-2 rounded-lg transition-all ${attendance[student._id]?.status === 'present'
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                                                        }`}
                                                    title="Present"
                                                >
                                                    <FaCheck />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(student._id, 'absent')}
                                                    className={`p-2 rounded-lg transition-all ${attendance[student._id]?.status === 'absent'
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                                                        }`}
                                                    title="Absent"
                                                >
                                                    <FaTimes />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(student._id, 'late')}
                                                    className={`p-2 rounded-lg transition-all ${attendance[student._id]?.status === 'late'
                                                            ? 'bg-amber-500 text-white'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600'
                                                        }`}
                                                    title="Late"
                                                >
                                                    <FaClock />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <input
                                                type="text"
                                                value={attendance[student._id]?.remarks || ''}
                                                onChange={(e) => handleRemarksChange(student._id, e.target.value)}
                                                placeholder="Optional remarks"
                                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AttendancePage;
