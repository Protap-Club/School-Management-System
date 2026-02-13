import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaIdCard, FaBuilding, FaLayerGroup, FaEnvelope, FaPhone, FaChalkboardTeacher } from 'react-icons/fa';

const STATUS_BADGE = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-orange-100 text-orange-700',
};
const STAT_ITEMS = [
  { key: 'present', label: 'Present', bg: 'bg-green-50', border: 'border-green-100', labelColor: 'text-green-600', valueColor: 'text-green-700' },
  { key: 'absent', label: 'Absent', bg: 'bg-red-50', border: 'border-red-100', labelColor: 'text-red-600', valueColor: 'text-red-700' },
  { key: 'late', label: 'Late', bg: 'bg-orange-50', border: 'border-orange-100', labelColor: 'text-orange-600', valueColor: 'text-orange-700' },
];
const UserDetailModal = ({ user, onClose }) => {
  if (!user) return null;

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  useEffect(() => { generateMockHistory(); }, [user]);

  const generateMockHistory = () => {
    const mockData = [];
    const today = new Date();
    let present = 0, absent = 0, late = 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const r = Math.random();
      const status = r > 0.8 ? 'absent' : r > 0.7 ? 'late' : 'present';
      if (status === 'present') present++;
      if (status === 'absent') absent++;
      if (status === 'late') late++;

      mockData.push({ date: date.toISOString().split('T')[0], status, checkIn: status !== 'absent' ? '08:30 AM' : '-' });
    }
    setHistory(mockData);
    setStats({ present, absent, late });
  };

  const isStudent = user.role === 'student';
  const isTeacher = user.role === 'teacher';

  const renderInfoCard = (icon, label, value, textSize = 'text-lg') => (
    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">{icon} {label}</div>
      <p className={`${textSize} font-semibold text-gray-800`}>{value || '-'}</p>
    </div>
  );

  const renderParentCard = (emoji, label, name, contact) => (
    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">
        <span className={`${emoji === '👨' ? 'text-orange-500' : 'text-pink-500'}`}>{emoji}</span> {label}
      </div>
      <p className="text-sm font-semibold text-gray-800">{name || '-'}</p>
      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><FaPhone size={10} /> {contact || '-'}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-blue-100 uppercase text-xs font-bold tracking-wider mb-1">{user.role}</p>
                <div className="flex items-center gap-2 text-blue-50 text-sm"><FaEnvelope size={12} /> {user.email}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><FaTimes size={20} /></button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 border-b border-gray-100 shrink-0">
          {isStudent ? (
            <>
              {renderInfoCard(<FaIdCard className="text-blue-500" />, 'Roll No', user.profile?.rollNumber)}
              {renderInfoCard(<FaBuilding className="text-purple-500" />, 'Class', user.profile?.standard)}
              {renderInfoCard(<FaLayerGroup className="text-orange-500" />, 'Section', user.profile?.section)}
              {renderParentCard('👨', 'Father', user.profile?.fatherName, user.profile?.fatherContact)}
              {renderParentCard('👩', 'Mother', user.profile?.motherName, user.profile?.motherContact)}
            </>
          ) : (
            <>
              {renderInfoCard(<FaIdCard className="text-blue-500" />, 'ID', `#${user._id?.slice(-6).toUpperCase()}`)}
              {renderInfoCard(<FaPhone className="text-purple-500" />, 'Contact', user.phoneNumber)}
              {isTeacher && renderInfoCard(<FaChalkboardTeacher className="text-orange-500" />, 'Class Teacher',
                user.profile?.standard ? `${user.profile.standard} - ${user.profile.section}` : '-')}
            </>
          )}
          {renderInfoCard(<FaUser className="text-emerald-500" />, 'Status', 'Active')}
        </div>
        <div className="p-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Activity History (Last 30 Days)</h3>
          <div className="flex gap-4 mb-6">
            {STAT_ITEMS.map(({ key, label, bg, border, labelColor, valueColor }) => (
              <div key={key} className={`flex-1 ${bg} p-4 rounded-xl border ${border} text-center`}>
                <p className={`${labelColor} text-sm font-medium`}>{label}</p>
                <p className={`text-2xl font-bold ${valueColor}`}>{stats[key]}</p>
              </div>
            ))}
          </div>
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_BADGE[record.status]}`}>{record.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{record.checkIn}</td>
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
