import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../data/demo';
import DashboardLayout from '../layouts/DashboardLayout';
import TimetableGrid from '../components/timetable/TimetableGrid';
import TimetableModal from '../components/timetable/TimetableModal';
import { FaCalendarAlt, FaChalkboardTeacher, FaLayerGroup } from 'react-icons/fa';
import { useTimetableData } from '../hooks/useTimetableData';

const TIME_SLOTS = [
  { id: 1, startTime: "11:00 AM", endTime: "12:00 PM", type: "period" },
  { id: 2, startTime: "12:00 PM", endTime: "01:00 PM", type: "period" },
  { id: 3, startTime: "01:00 PM", endTime: "01:30 PM", type: "break", label: "Lunch Break" },
  { id: 4, startTime: "01:30 PM", endTime: "02:30 PM", type: "period" },
  { id: 5, startTime: "02:30 PM", endTime: "03:30 PM", type: "period" },
  { id: 6, startTime: "03:30 PM", endTime: "04:00 PM", type: "break", label: "Short Break" },
  { id: 7, startTime: "04:00 PM", endTime: "05:00 PM", type: "period" },
];

const TimetablePage = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  // Explicitly check for admin/super_admin roles for clarity, though !isTeacher implies this in current logic
  const isStaff = ['super_admin', 'admin'].includes(user?.role);

  // Debugging
  useEffect(() => {
    console.log('TimetablePage: Current User Role:', user?.role);
  }, [user]);

  // Data extraction constants
  const SCHOOL_CODE = 'DPS'; // Default to DPS for demo
  const allTeachers = DEMO_USERS[SCHOOL_CODE].teachers;

  // Extract classes from teachers list (Standard + Section)
  const classes = useMemo(() => {
    const classSet = new Set();
    const classList = [];

    allTeachers.forEach(t => {
      const classId = `${t.standard}-${t.section}`;
      if (!classSet.has(classId)) {
        classSet.add(classId);
        classList.push({
          id: classId,
          name: `Class ${t.standard} ${t.section}`
        });
      }
    });
    return classList.sort((a, b) => a.name.localeCompare(b.name));
  }, [allTeachers]);

  // State
  const [activeTab, setActiveTab] = useState('my-timetable'); // For teachers

  // Use Custom Hook for Data
  const { timetableData, addOrUpdateEntry, deleteEntry } = useTimetableData();

  const [selectedClass, setSelectedClass] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null); // { day, slot, entry }

  // Set default selected class on load
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  // Derive display data based on role/view
  const currentTimetable = useMemo(() => {
    if (isTeacher && activeTab === 'my-timetable') {
      // Check if logged in user is one of the demo teachers by email
      // If not found, fall back to first teacher or empty
      const myEmail = user?.email || allTeachers[0].email;

      console.log('TimetablePage: Filtering for Teacher View');
      console.log('TimetablePage: My Email:', myEmail);
      console.log('TimetablePage: My Role:', user?.role);
      console.log('TimetablePage: Total Data:', timetableData.length);

      return timetableData.filter(t => {
        // Strict email match first
        if (t.teacherEmail === myEmail) return true;

        // Fallback: Check if user name is part of the teacherEmail string (mock simulation)
        // e.g. user "Priya" matches "priya@dps.com"
        const namePart = user?.name?.toLowerCase().split(' ')[0] || '';
        if (namePart && t.teacherEmail.includes(namePart)) return true;

        return false;
      });
    } else {
      // Class View (Admin/SuperAdmin or Teacher viewing class)
      console.log('TimetablePage: Filtering for Class View');
      console.log('TimetablePage: Selected Class:', selectedClass);
      console.log('TimetablePage: Total Data:', timetableData.length);
      return timetableData.filter(t => t.classId === selectedClass);
    }
  }, [timetableData, selectedClass, isTeacher, activeTab, user, allTeachers]);

  // Handlers
  const handleCellClick = (day, slot, entry) => {
    setSelectedCell({ day, slot, entry });
    setIsModalOpen(true);
  };

  const handleSaveEntry = (formData) => {
    const newEntry = {
      id: selectedCell.entry ? selectedCell.entry.id : Date.now(),
      classId: selectedClass,
      day: selectedCell.day,
      timeSlotId: selectedCell.slot.id,
      ...formData,
    };
    addOrUpdateEntry(newEntry);
  };

  const handleDeleteEntry = (entryToDelete) => {
    deleteEntry(entryToDelete);
  };

  // Safe check if classes are loaded
  if (classes.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-gray-500">
          Loading data...
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaCalendarAlt className="text-primary" />
              Timetable Management
            </h1>
            <p className="text-gray-500 mt-1">
              {isTeacher
                ? 'View your schedule and class timetables.'
                : 'Manage class schedules and periods.'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {/* Role-Specific Controls */}
            {isTeacher ? (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('my-timetable')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'my-timetable'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <FaChalkboardTeacher />
                    Personal Timetable
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('class-timetable')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'class-timetable'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <FaLayerGroup />
                    Class Timetable
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                <label className="text-sm font-medium text-gray-600 pl-2">Select Class:</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 min-w-[150px]"
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Teacher Class Selector (Only if viewing class timetable) */}
            {isTeacher && activeTab === 'class-timetable' && (
              <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                <label className="text-sm font-medium text-gray-600 pl-2">Viewing:</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 min-w-[150px]"
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TimetableGrid
            timetableData={currentTimetable}
            onCellClick={handleCellClick}
            readOnly={isTeacher} // Teacher is always read-only
            showClass={isTeacher && activeTab === 'my-timetable'}
            timeSlots={TIME_SLOTS}
            teachers={allTeachers}
          />
        </div>

        {/* Modal */}
        <TimetableModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
          initialData={selectedCell?.entry}
          slotInfo={selectedCell ? { day: selectedCell.day, time: `${selectedCell.slot.startTime} - ${selectedCell.slot.endTime}` } : null}
          teachers={allTeachers}
        />
      </div>
    </DashboardLayout>
  );
};

export default TimetablePage;
