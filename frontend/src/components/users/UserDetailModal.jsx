import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaIdCard, FaBuilding, FaLayerGroup, FaEnvelope, FaPhone, FaChalkboardTeacher } from 'react-icons/fa';

/**
 * Modal to display user details and mock history
 */
const UserDetailModal = ({ user, onClose }) => {
  if (!user) return null;

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  useEffect(() => {
    // Mock generation of history data
    generateMockHistory();
  }, [user]);

  const generateMockHistory = () => {
    const mockData = [];
    const today = new Date();
    let present = 0;
    let absent = 0;
    let late = 0;

    // Generate last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const r = Math.random();
      let status = 'present';

      if (r > 0.8) status = 'absent';
      else if (r > 0.7) status = 'late';

      if (status === 'present') present++;
      if (status === 'absent') absent++;
      if (status === 'late') late++;

      mockData.push({
        date: date.toISOString().split('T')[0],
        status: status,
        checkIn: status !== 'absent' ? '08:30 AM' : '-'
      });
    }

    setHistory(mockData);
    setStats({ present, absent, late });
  };

  const isStudent = user.role === 'student';
  const isTeacher = user.role === 'teacher';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-blue-100 uppercase text-xs font-bold tracking-wider mb-1">{user.role}</p>
                <div className="flex items-center gap-2 text-blue-50 text-sm">
                  <FaEnvelope size={12} /> {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 border-b border-gray-100 shrink-0">
          {/* Render different fields based on role */}
          {isStudent ? (
            <>
              <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">
                  <FaIdCard className="text-blue-500" /> Roll No
                </div>
                <p className="text-lg font-semibold text-gray-800">{user.profile?.rollNumber || '-'}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">
                  <FaBuilding className="text-purple-500" /> Class
                </div>
                <p className="text-lg font-semibold text-gray-800">{user.profile?.standard || '-'}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">
                  <FaLayerGroup className="text-orange-500" /> Section
                </div>
                <p className="text-lg font-semibold text-gray-800">{user.profile?.section || '-'}</p>
              </div>
            </>
          ) : (
            // Generic/Teacher Fields
            <>
              <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">
                  <FaIdCard className="text-blue-500" /> ID
                </div>
                <p className="text-lg font-semibold text-gray-800">#{user._id?.slice(-6).toUpperCase()}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">
                  <FaPhone className="text-purple-500" /> Contact
                </div>
                <p className="text-lg font-semibold text-gray-800">{user.phoneNumber || '-'}</p>
              </div>
              {isTeacher && (
                <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">
                    <FaChalkboardTeacher className="text-orange-500" /> Class Teacher
                  </div>
                  <p className="text-lg font-semibold text-gray-800">
                    {user.profile?.standard ? `${user.profile.standard} - ${user.profile.section}` : '-'}
                  </p>
                </div>
              )}
            </>
          )}

          <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">
              <FaUser className="text-emerald-500" /> Status
            </div>
            <p className="text-lg font-semibold text-gray-800">Active</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Activity History (Last 30 Days)</h3>

          {/* Stats */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-green-50 p-4 rounded-xl border border-green-100 text-center">
              <p className="text-green-600 text-sm font-medium">Present</p>
              <p className="text-2xl font-bold text-green-700">{stats.present}</p>
            </div>
            <div className="flex-1 bg-red-50 p-4 rounded-xl border border-red-100 text-center">
              <p className="text-red-600 text-sm font-medium">Absent</p>
              <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
            </div>
            <div className="flex-1 bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
              <p className="text-orange-600 text-sm font-medium">Late</p>
              <p className="text-2xl font-bold text-orange-700">{stats.late}</p>
            </div>
          </div>

          {/* History Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-l-lg bg-gray-50">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase bg-gray-50">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-r-lg bg-gray-50">Check In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                                            ${record.status === 'present' ? 'bg-green-100 text-green-700' :
                        record.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                    {record.checkIn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
