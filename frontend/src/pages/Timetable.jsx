import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth';
import DashboardLayout from '../layouts/DashboardLayout';
import TimetableGrid from '../components/timetable/TimetableGrid';
import TimetableModal from '../components/timetable/TimetableModal';
import { FaCalendarAlt, FaChalkboardTeacher, FaPlus, FaSpinner } from 'react-icons/fa';
import { useTimetableData } from '../hooks/useTimetableData';

const TimetablePage = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const {
    timeSlots, timetables, selectedTimetable, entries, teachers, availableClasses, loading, error,
    addTimetable, selectTimetable, addEntry, editEntry, removeEntry, fetchTeacherSchedule, fetchMySchedule, clearError
  } = useTimetableData(user?.role, user?._id);

  // View state
  const [adminViewMode, setAdminViewMode] = useState('class');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherScheduleData, setTeacherScheduleData] = useState(null);

  // Modal state
  const [modalState, setModalState] = useState({ open: false, cell: null, saving: false });
  const [createState, setCreateState] = useState({
    open: false,
    form: { standard: '', section: '', academicYear: new Date().getFullYear() },
    loading: false
  });

  // Update initial form values when availableClasses changes
  useEffect(() => {
    if (createState.open && !createState.form.standard && availableClasses.standards.length > 0) {
      setCreateState(prev => ({
        ...prev,
        form: {
          ...prev.form,
          standard: availableClasses.standards[0],
          section: availableClasses.sections[0] || ''
        }
      }));
    }
  }, [createState.open, availableClasses, createState.form.standard]);

  const isTeacherScheduleView = isTeacher || (!isTeacher && adminViewMode === 'teacher');

  useEffect(() => {
    if (!isTeacher && timetables.length > 0 && !selectedTimetable) selectTimetable(timetables[0]._id);
  }, [isTeacher, timetables, selectedTimetable, selectTimetable]);

  useEffect(() => {
    if (isTeacher && user?._id) setSelectedTeacherId(user._id);
    else if (teachers.length > 0 && !selectedTeacherId) setSelectedTeacherId(teachers[0]._id);
  }, [teachers, selectedTeacherId, isTeacher, user]);

  useEffect(() => {
    if (!isTeacherScheduleView) return;
    (async () => {
      const result = isTeacher
        ? await fetchMySchedule()
        : await fetchTeacherSchedule(selectedTeacherId);
      if (result.success) setTeacherScheduleData(result.data);
    })();
  }, [isTeacher, adminViewMode, selectedTeacherId, fetchTeacherSchedule, fetchMySchedule, isTeacherScheduleView]);

  const displayEntries = useMemo(() => {
    if (isTeacherScheduleView) {
      if (!teacherScheduleData) return [];
      return Object.values(teacherScheduleData).flat();
    }
    return entries;
  }, [isTeacherScheduleView, entries, teacherScheduleData]);

  const closeModal = useCallback(() => setModalState({ open: false, cell: null, saving: false }), []);

  const handleCellClick = useCallback((day, slot, entry) => {
    setModalState({ open: true, cell: { day, slot, entry }, saving: false });
  }, []);

  const handleSaveEntry = useCallback(async (entryData, existingEntryId) => {
    if (!selectedTimetable) return;
    setModalState(prev => ({ ...prev, saving: true }));
    try {
      const result = existingEntryId ? await editEntry(existingEntryId, entryData) : await addEntry(selectedTimetable._id, entryData);
      if (result.success) closeModal();
      else alert(result.error || 'Failed to save entry');
    } finally { setModalState(prev => ({ ...prev, saving: false })); }
  }, [selectedTimetable, editEntry, addEntry, closeModal]);

  const handleDeleteEntry = useCallback(async (entryId) => {
    setModalState(prev => ({ ...prev, saving: true }));
    try {
      const result = await removeEntry(entryId);
      if (result.success) closeModal();
      else alert(result.error || 'Failed to delete entry');
    } finally { setModalState(prev => ({ ...prev, saving: false })); }
  }, [removeEntry, closeModal]);

  const handleCreateTimetable = useCallback(async (e) => {
    e.preventDefault();
    setCreateState(prev => ({ ...prev, loading: true }));
    try {
      const result = await addTimetable({ standard: createState.form.standard, section: createState.form.section, academicYear: parseInt(createState.form.academicYear) });
      if (result.success) {
        setCreateState({ open: false, form: { standard: '', section: '', academicYear: new Date().getFullYear() }, loading: false });
        const newId = result.data?.timetable?._id || result.data?._id;
        if (newId) selectTimetable(newId);
      } else { alert(result.error || 'Failed to create timetable'); }
    } finally { setCreateState(prev => ({ ...prev, loading: false })); }
  }, [createState.form, addTimetable, selectTimetable]);

  const renderTabButton = (tabKey, icon, label, isActive) => {
    const teacherStyle = isTeacher ? 'px-4 py-2 rounded-lg' : 'px-3 py-1.5 rounded-md';
    return (
      <button onClick={() => isTeacher ? setActiveTab(tabKey) : setAdminViewMode(tabKey)}
        className={`${teacherStyle} text-sm font-medium transition-all ${isActive ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
        {icon ? <div className="flex items-center gap-2">{icon}{label}</div> : label}
      </button>
    );
  };

  if (loading && timeSlots.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64"><FaSpinner className="animate-spin text-primary text-3xl" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">&times;</button>
          </div>
        )}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaCalendarAlt className="text-primary" /> Timetable</h1>
            <p className="text-gray-500 text-sm mt-0.5">{isTeacher ? 'View your schedule and class timetables.' : 'Manage class schedules and periods.'}</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {isTeacher ? (
              <>
                <div className="flex bg-gray-100 p-1 rounded-xl items-center">
                  <span className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-primary shadow-sm flex items-center gap-2">
                    <FaChalkboardTeacher />
                    My Schedule
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  {renderTabButton('class', null, 'Class', adminViewMode === 'class')}
                  {renderTabButton('teacher', null, 'Teacher', adminViewMode === 'teacher')}
                </div>
                {adminViewMode === 'class' ? (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600 pl-2">Class:</label>
                    <select value={selectedTimetable?._id || ''} onChange={(e) => selectTimetable(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 min-w-[180px]">
                      {timetables.length === 0 && <option value="">No timetables</option>}
                      {timetables.map(tt => <option key={tt._id} value={tt._id}>{tt.standard}-{tt.section} ({tt.academicYear})</option>)}
                    </select>
                    <button onClick={() => setCreateState(prev => ({ ...prev, open: true }))} className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors" title="Create Timetable">
                      <FaPlus className="text-sm" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600 pl-2">Teacher:</label>
                    <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 min-w-[180px]">
                      {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <TimetableGrid entries={displayEntries} timeSlots={timeSlots} teachers={teachers}
            onCellClick={handleCellClick} readOnly={isTeacherScheduleView} showClass={isTeacherScheduleView} />
        </div>
        <TimetableModal isOpen={modalState.open} onClose={closeModal} onSave={handleSaveEntry} onDelete={handleDeleteEntry}
          initialData={modalState.cell?.entry} slotInfo={modalState.cell ? { day: modalState.cell.day, slot: modalState.cell.slot } : null}
          teachers={teachers} subjects={availableClasses.subjects} rooms={availableClasses.rooms} loading={modalState.saving} />
        {createState.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">Create New Timetable</h3>
              </div>
              <form onSubmit={handleCreateTimetable} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard (Class) *</label>
                  {availableClasses.standards.length > 0 ? (
                    <select
                      required
                      value={createState.form.standard}
                      onChange={(e) => setCreateState(prev => ({ ...prev, form: { ...prev.form, standard: e.target.value } }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {availableClasses.standards.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={createState.form.standard}
                      onChange={(e) => setCreateState(prev => ({ ...prev, form: { ...prev.form, standard: e.target.value } }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. 10th"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                  {availableClasses.sections.length > 0 ? (
                    <select
                      required
                      value={createState.form.section}
                      onChange={(e) => setCreateState(prev => ({ ...prev, form: { ...prev.form, section: e.target.value } }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {availableClasses.sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={createState.form.section}
                      onChange={(e) => setCreateState(prev => ({ ...prev, form: { ...prev.form, section: e.target.value } }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. A"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                  <input
                    type="number"
                    required
                    value={createState.form.academicYear}
                    onChange={(e) => setCreateState(prev => ({ ...prev, form: { ...prev.form, academicYear: e.target.value } }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    min="2000"
                    max="2100"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setCreateState(prev => ({ ...prev, open: false }))} disabled={createState.loading}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={createState.loading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark flex items-center justify-center gap-2">
                    {createState.loading && <FaSpinner className="animate-spin" />} Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TimetablePage;
