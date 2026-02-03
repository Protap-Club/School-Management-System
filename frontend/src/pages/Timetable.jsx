import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth';
import DashboardLayout from '../layouts/DashboardLayout';
import TimetableGrid from '../components/timetable/TimetableGrid';
import TimetableModal from '../components/timetable/TimetableModal';
import { FaCalendarAlt, FaChalkboardTeacher, FaLayerGroup, FaPlus, FaSpinner, FaCog, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { useTimetableData } from '../hooks/useTimetableData';
import { TIMETABLE_STATUS } from '../api/timetable';

const TimetablePage = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  // Hook for all timetable data and operations - pass role for permission-based fetching
  const {
    timeSlots,
    timetables,
    selectedTimetable,
    entries,
    teachers,
    loading,
    error,
    addTimetable,
    updateStatus,
    removeTimetable,
    selectTimetable,
    addEntry,
    editEntry,
    removeEntry,
    fetchTeacherSchedule,
    clearError
  } = useTimetableData(user?.role, user?._id);

  // UI State
  const [activeTab, setActiveTab] = useState('class-timetable');
  const [adminViewMode, setAdminViewMode] = useState('class'); // 'class' or 'teacher'
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherScheduleData, setTeacherScheduleData] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Create Timetable Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ standard: '', section: '', academicYear: new Date().getFullYear() });
  const [createLoading, setCreateLoading] = useState(false);

  // Set default timetable when timetables load
  useEffect(() => {
    if (timetables.length > 0 && !selectedTimetable) {
      selectTimetable(timetables[0]._id);
    }
  }, [timetables, selectedTimetable, selectTimetable]);

  // Set default teacher when teachers load (for teacher view)
  useEffect(() => {
    if (isTeacher && user?._id) {
      setSelectedTeacherId(user._id);
    } else if (teachers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachers[0]._id);
    }
  }, [teachers, selectedTeacherId, isTeacher, user]);

  // Fetch teacher schedule when viewing teacher mode
  useEffect(() => {
    const fetchSchedule = async () => {
      if ((isTeacher && activeTab === 'my-timetable') || (!isTeacher && adminViewMode === 'teacher')) {
        const teacherId = isTeacher ? user?._id : selectedTeacherId;
        if (teacherId) {
          const result = await fetchTeacherSchedule(teacherId);
          console.log('DEBUG fetchTeacherSchedule result:', result);
          if (result.success) {
            console.log('DEBUG setting teacherScheduleData:', result.data);
            setTeacherScheduleData(result.data);
          }
        }
      }
    };
    fetchSchedule();
  }, [isTeacher, activeTab, adminViewMode, selectedTeacherId, user, fetchTeacherSchedule]);

  // Determine if we're in a read-only view
  const isReadOnly = useMemo(() => {
    if (isTeacher && activeTab === 'my-timetable') return true;
    if (!isTeacher && adminViewMode === 'teacher') return true;
    return false;
  }, [isTeacher, activeTab, adminViewMode]);

  // Get display entries based on current view mode
  const displayEntries = useMemo(() => {
    if ((isTeacher && activeTab === 'my-timetable') || (!isTeacher && adminViewMode === 'teacher')) {
      // Teacher schedule view - flatten schedule object to array
      // Backend returns { teacherSchedule: { Mon: [], Tue: [], ... } }
      if (!teacherScheduleData?.teacherSchedule) return [];
      const allEntries = [];
      Object.values(teacherScheduleData.teacherSchedule).forEach(dayEntries => {
        allEntries.push(...dayEntries);
      });
      console.log('DEBUG displayEntries (teacher schedule):', allEntries);
      return allEntries;
    }
    // Class timetable view
    return entries;
  }, [isTeacher, activeTab, adminViewMode, entries, teacherScheduleData]);

  // Handlers
  const handleCellClick = (day, slot, entry) => {
    setSelectedCell({ day, slot, entry });
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (entryData, existingEntryId) => {
    if (!selectedTimetable) return;

    setSaveLoading(true);
    try {
      let result;
      if (existingEntryId) {
        result = await editEntry(existingEntryId, entryData);
      } else {
        result = await addEntry(selectedTimetable._id, entryData);
      }

      if (result.success) {
        setIsModalOpen(false);
        setSelectedCell(null);
      } else {
        alert(result.error || 'Failed to save entry');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    setSaveLoading(true);
    try {
      const result = await removeEntry(entryId);
      if (result.success) {
        setIsModalOpen(false);
        setSelectedCell(null);
      } else {
        alert(result.error || 'Failed to delete entry');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTimetableSelect = (e) => {
    selectTimetable(e.target.value);
  };

  const handleTeacherSelect = (e) => {
    setSelectedTeacherId(e.target.value);
  };

  const handleCreateTimetable = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const result = await addTimetable({
        standard: createForm.standard,
        section: createForm.section,
        academicYear: parseInt(createForm.academicYear)
      });
      if (result.success) {
        setIsCreateModalOpen(false);
        setCreateForm({ standard: '', section: '', academicYear: new Date().getFullYear() });
        // Select the newly created timetable
        const newId = result.data?.timetable?._id || result.data?._id;
        if (newId) {
          selectTimetable(newId);
        }
      } else {
        alert(result.error || 'Failed to create timetable');
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedTimetable) return;
    const newStatus = selectedTimetable.status === TIMETABLE_STATUS.PUBLISHED
      ? TIMETABLE_STATUS.DRAFT
      : TIMETABLE_STATUS.PUBLISHED;
    await updateStatus(selectedTimetable._id, newStatus);
  };

  // Loading state
  if (loading && timeSlots.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <FaSpinner className="animate-spin text-primary text-3xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">&times;</button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaCalendarAlt className="text-primary" />
              Timetable
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isTeacher
                ? 'View your schedule and class timetables.'
                : 'Manage class schedules and periods.'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {/* Role-Specific Controls */}
            {isTeacher ? (
              <>
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
                      My Schedule
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

                {/* Class Label for Teacher (when on Class Timetable tab) - no switching */}
                {activeTab === 'class-timetable' && selectedTimetable && (
                  <div className="flex items-center gap-2 ml-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Class:</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {selectedTimetable.standard}-{selectedTimetable.section} ({selectedTimetable.academicYear})
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                {/* Admin View Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setAdminViewMode('class')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${adminViewMode === 'class' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Class
                  </button>
                  <button
                    onClick={() => setAdminViewMode('teacher')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${adminViewMode === 'teacher' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Teacher
                  </button>
                </div>

                {/* Conditional Selectors */}
                {adminViewMode === 'class' ? (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600 pl-2">Class:</label>
                    <select
                      value={selectedTimetable?._id || ''}
                      onChange={handleTimetableSelect}
                      className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 min-w-[180px]"
                    >
                      {timetables.length === 0 && (
                        <option value="">No timetables</option>
                      )}
                      {timetables.map(tt => (
                        <option key={tt._id} value={tt._id}>
                          {tt.standard}-{tt.section} ({tt.academicYear})
                        </option>
                      ))}
                    </select>

                    {/* Create Button */}
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                      title="Create Timetable"
                    >
                      <FaPlus className="text-sm" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600 pl-2">Teacher:</label>
                    <select
                      value={selectedTeacherId}
                      onChange={handleTeacherSelect}
                      className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 min-w-[180px]"
                    >
                      {teachers.map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Status Toggle (Admin only, Class view) */}
            {isAdmin && adminViewMode === 'class' && selectedTimetable && (
              <button
                onClick={handleToggleStatus}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${selectedTimetable.status === TIMETABLE_STATUS.PUBLISHED
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
              >
                {selectedTimetable.status === TIMETABLE_STATUS.PUBLISHED ? (
                  <>
                    <FaToggleOn className="text-green-500" />
                    Published
                  </>
                ) : (
                  <>
                    <FaToggleOff className="text-gray-400" />
                    Draft
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <TimetableGrid
            entries={displayEntries}
            timeSlots={timeSlots}
            teachers={teachers}
            onCellClick={handleCellClick}
            readOnly={isReadOnly}
            showClass={(isTeacher && activeTab === 'my-timetable') || (!isTeacher && adminViewMode === 'teacher')}
          />
        </div>

        {/* Entry Modal */}
        <TimetableModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCell(null);
          }}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
          initialData={selectedCell?.entry}
          slotInfo={selectedCell ? { day: selectedCell.day, slot: selectedCell.slot } : null}
          teachers={teachers}
          loading={saveLoading}
        />

        {/* Create Timetable Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">Create New Timetable</h3>
              </div>
              <form onSubmit={handleCreateTimetable} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
                  <input
                    type="text"
                    required
                    value={createForm.standard}
                    onChange={(e) => setCreateForm({ ...createForm, standard: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. 10th"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                  <input
                    type="text"
                    required
                    value={createForm.section}
                    onChange={(e) => setCreateForm({ ...createForm, section: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                  <input
                    type="number"
                    required
                    min="2000"
                    max="2100"
                    value={createForm.academicYear}
                    onChange={(e) => setCreateForm({ ...createForm, academicYear: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark flex items-center justify-center gap-2"
                  >
                    {createLoading && <FaSpinner className="animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout >
  );
};

export default TimetablePage;
