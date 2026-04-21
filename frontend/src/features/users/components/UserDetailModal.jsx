import React, { useState, useEffect, useMemo } from 'react';
import {
  FaTimes, FaIdCard, FaBuilding, FaLayerGroup, FaEnvelope, FaPhone, FaSave, FaChalkboardTeacher, FaWallet
} from 'react-icons/fa';
import { useUpdateTeacherExpectedSalary, useUpdateUser, useUsers } from '../api/queries';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import { useAuth } from '../../../features/auth';
import { formatValue } from '../../../utils';
import TeacherConflictModal from './TeacherConflictModal';

const LIGHT_SELECT_CLASS = 'w-full bg-white text-gray-900 rounded px-2 py-1.5 text-xs font-black outline-none border border-gray-100 focus:border-blue-300 transition-all';

const naturalSort = (arr) => {
  return [...arr].sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
};

const buildClassKey = ({ standard, section } = {}) =>
  `${String(standard || '').trim()}::${String(section || '').trim().toUpperCase()}`;

const normalizeAssignedClassesForCompare = (assignedClasses = []) =>
  (Array.isArray(assignedClasses) ? assignedClasses : []).map((item) => ({
    standard: String(item?.standard || '').trim(),
    section: String(item?.section || '').trim().toUpperCase(),
    subjects: Array.isArray(item?.subjects) ? [...item.subjects] : [],
  }));

const UserDetailModal = ({ user, onClose, initialMode = 'view', onSuccess }) => {
  const { user: currentUser } = useAuth();
  const isTeacherLoggedIn = currentUser?.role === 'teacher';
  const canViewContacts = ['admin', 'super_admin'].includes(currentUser?.role);

  const updateUserMutation = useUpdateUser();
  const updateTeacherExpectedSalaryMutation = useUpdateTeacherExpectedSalary();
  const teachersQuery = useUsers({ role: 'teacher', pageSize: 5000, enabled: initialMode === 'edit' && user?.role === 'teacher' });
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({});
  const [guardianTab, setGuardianTab] = useState('parents');
  const [teacherClassDraft, setTeacherClassDraft] = useState({ standard: '', section: '' });
  const [saveError, setSaveError] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        contactNo: user.contactNo || user.phoneNumber || '',
        role: user.role || '',
        profile: {
          rollNumber: user.profile?.rollNumber || '',
          standard: user.profile?.standard || '',
          section: user.profile?.section || '',
          department: user.profile?.department || '',
          expectedSalary: user.profile?.expectedSalary ?? '',
          assignedClasses: user.profile?.assignedClasses || [],
          fatherName: user.profile?.fatherName || '',
          fatherContact: user.profile?.fatherContact || '',
          motherName: user.profile?.motherName || '',
          motherContact: user.profile?.motherContact || '',
          guardianName: user.profile?.guardianName || '',
          guardianContact: user.profile?.guardianContact || '',
        }
      });
      setMode(initialMode);
      setTeacherClassDraft({ standard: '', section: '' });
      setSaveError('');
    }
  }, [user, initialMode]);

  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const isEditing = mode === 'edit';
  const isArchivedUser = Boolean(user?.isArchived);
  const isActiveUser = Boolean(user?.isActive);
  const { classSections } = useSchoolClasses({ enabled: isEditing && (isStudent || isTeacher) });
  const currentTeacherClassKeys = useMemo(
    () => new Set((formData.profile?.assignedClasses || []).map((item) => buildClassKey(item))),
    [formData.profile?.assignedClasses]
  );
  const occupiedTeacherClassKeys = useMemo(() => {
    return new Set(
      (teachersQuery.data?.data?.users || [])
        .filter((teacher) => String(teacher._id) !== String(user?._id))
        .map((teacher) => teacher.profile?.assignedClasses?.[0])
        .filter(Boolean)
        .map((item) => buildClassKey(item))
    );
  }, [teachersQuery.data?.data?.users, user?._id]);
  const classSectionsMap = useMemo(() => {
    const map = {};

    classSections.forEach((pair) => {
      const standard = String(pair?.standard || '').trim();
      const section = String(pair?.section || '').trim().toUpperCase();
      if (!standard || !section) return;
      if (!map[standard]) map[standard] = new Set();
      map[standard].add(section);
    });

    return Object.fromEntries(
      Object.entries(map).map(([standard, sections]) => [standard, naturalSort(Array.from(sections))])
    );
  }, [classSections]);

  const standards = useMemo(
    () => naturalSort(Object.keys(classSectionsMap)),
    [classSectionsMap]
  );

  useEffect(() => {
    if (!isTeacher || !isEditing) return;
    setTeacherClassDraft((current) => {
      if (current.standard || current.section) return current;
      const existing = formData.profile?.assignedClasses?.[0] || {};
      const fallbackStandard = existing.standard || standards[0] || '';
      const fallbackSection = existing.section || (fallbackStandard ? (classSectionsMap[fallbackStandard] || [])[0] : '') || '';
      return { standard: fallbackStandard, section: fallbackSection };
    });
  }, [classSectionsMap, formData.profile?.assignedClasses, isEditing, isTeacher, standards]);

  const memberStatus = isArchivedUser
    ? { dotClass: 'bg-amber-400', labelClass: 'text-amber-100', label: 'Archived Member' }
    : isActiveUser
      ? { dotClass: 'bg-emerald-400', labelClass: 'text-blue-100', label: 'Active Member' }
      : { dotClass: 'bg-gray-300', labelClass: 'text-gray-200', label: 'Inactive Member' };

  useEffect(() => {
    if (!isEditing || !isStudent) return;

    const selectedStandardValue = String(formData.profile?.standard || '').trim();
    const selectedSectionValue = String(formData.profile?.section || '').trim().toUpperCase();
    if (!selectedStandardValue) return;

    const allowedSections = classSectionsMap[selectedStandardValue] || [];
    if (allowedSections.length === 0) {
      setFormData((current) => ({
        ...current,
        profile: { ...current.profile, standard: '', section: '' }
      }));
      return;
    }

    if (selectedSectionValue && allowedSections.includes(selectedSectionValue)) {
      return;
    }

    setFormData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        section: ''
      }
    }));
  }, [classSectionsMap, formData.profile?.section, formData.profile?.standard, isEditing, isStudent]);

  if (!user) return null;

  const handleConfirmConflict = async () => {
    if (!pendingPayload) return;
    try {
      setSaveError('');
      setShowConflictModal(false);
      await updateUserMutation.mutateAsync({
        id: user._id,
        payload: { ...pendingPayload, forceOverride: true }
      });
      if (onSuccess) onSuccess('User updated successfully (override)');
      setMode('view');
    } catch (error) {
      setSaveError(error?.response?.data?.message || 'Failed to override conflict');
    } finally {
      setPendingPayload(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaveError('');

      // New Validation for Admin/Super Admin
      if (!isTeacherLoggedIn && isStudent) {
        if (formData.profile?.fatherName?.trim() && !formData.profile?.fatherContact?.trim()) {
          setSaveError("Father's contact number is required.");
          return;
        }
        if (formData.profile?.motherName?.trim() && !formData.profile?.motherContact?.trim()) {
          setSaveError("Mother's contact number is required.");
          return;
        }
        if (formData.profile?.guardianName?.trim() && !formData.profile?.guardianContact?.trim()) {
          setSaveError("Guardian's contact number is required.");
          return;
        }
      }

      // Construct role-specific profile payload
      const rawProfile = formData.profile || {};
      const profilePayload = {};

      if (isStudent) {
        const studentFields = [
          'rollNumber', 'standard', 'section', 'year', 'admissionDate',
          'fatherName', 'fatherContact', 'motherName', 'motherContact',
          'guardianName', 'guardianContact', 'address'
        ];
        studentFields.forEach(field => {
          if (rawProfile[field] !== undefined && rawProfile[field] !== '') {
            profilePayload[field] = rawProfile[field];
          }
        });
      } else if (isTeacher) {
        const teacherFields = ['employeeId', 'qualification', 'joiningDate'];
        teacherFields.forEach(field => {
          if (rawProfile[field] !== undefined && rawProfile[field] !== '') {
            profilePayload[field] = rawProfile[field];
          }
        });

        // Handle assignedClasses separately because of potential conflicts
        const originalAssignedClasses = normalizeAssignedClassesForCompare(user?.profile?.assignedClasses);
        const nextAssignedClasses = normalizeAssignedClassesForCompare(rawProfile.assignedClasses);
        const hasAssignedClassChanges = JSON.stringify(originalAssignedClasses) !== JSON.stringify(nextAssignedClasses);

        if (hasAssignedClassChanges) {
          profilePayload.assignedClasses = rawProfile.assignedClasses;
        }
      } else if (isAdminUser) {
        const adminFields = ['department', 'employeeId', 'permissions'];
        adminFields.forEach(field => {
          if (rawProfile[field] !== undefined && rawProfile[field] !== '') {
            profilePayload[field] = rawProfile[field];
          }
        });
      }

      const hasExpectedSalaryChanged =
        isTeacher && rawProfile.expectedSalary !== undefined &&
        Number(rawProfile.expectedSalary) !== Number(user?.profile?.expectedSalary);

      const payload = {
        name: formData.name,
        email: formData.email,
        contactNo: formData.contactNo,
        profile: profilePayload,
      };

      await updateUserMutation.mutateAsync({
        id: user._id,
        payload
      });

      if (hasExpectedSalaryChanged) {
        await updateTeacherExpectedSalaryMutation.mutateAsync({
          id: user._id,
          payload: { expectedSalary: Number(formData.profile?.expectedSalary) }
        });
      }
      if (onSuccess) onSuccess('User updated successfully');
      setMode('view');
    } catch (error) {
      console.error('Update error:', error);
      const errorMessage = error?.response?.data?.error?.message || error?.response?.data?.message || 'Failed to update user';
      
      if (error?.response?.status === 409 && error.response.data?.code === 'CLASS_TEACHER_ALREADY_ASSIGNED') {
        const payload = {
          name: formData.name,
          email: formData.email,
          contactNo: formData.contactNo,
          profile: { ...formData.profile }
        };
        setConflicts(error.response.data.conflicts || []);
        setPendingPayload(payload);
        setShowConflictModal(true);
        return;
      }
      setSaveError(errorMessage);
    }
  };
  const handleAddTeacherClass = () => {
    const standard = String(teacherClassDraft.standard || '').trim();
    const section = String(teacherClassDraft.section || '').trim().toUpperCase();
    if (!standard || !section) return;

    const current = Array.isArray(formData.profile?.assignedClasses)
      ? formData.profile.assignedClasses
      : [];

    const exists = current.some(
      (cls) => String(cls.standard) === standard && String(cls.section).toUpperCase() === section
    );
    if (exists) return;

    const nextClassKey = buildClassKey({ standard, section });
    if (occupiedTeacherClassKeys.has(nextClassKey)) {
      setSaveError('This class already has a class teacher assigned.');
      return;
    }

    const next = [{ standard, section, subjects: [] }];
    setFormData((prev) => ({
      ...prev,
      profile: { ...prev.profile, assignedClasses: next }
    }));
    setSaveError('');
  };

  const handleRemoveTeacherClass = (target) => {
    const current = Array.isArray(formData.profile?.assignedClasses)
      ? formData.profile.assignedClasses
      : [];
    const next = current.filter(
      (cls) => !(String(cls.standard) === String(target.standard) && String(cls.section).toUpperCase() === String(target.section).toUpperCase())
    );
    setFormData((prev) => ({
      ...prev,
      profile: { ...prev.profile, assignedClasses: next }
    }));
  };
  // Helper to get teacher's primary class
  const getTeacherClass = () => {
    const classes = formData.profile?.assignedClasses || [];
    if (classes.length > 0) {
      return `${classes[0].standard}${classes[0].section}`;
    }
    return 'Not Assigned';
  };
  const selectedStandard = String(formData.profile?.standard || '').trim();
  const sections = selectedStandard ? (classSectionsMap[selectedStandard] || []) : [];
  const teacherSelectedStandard = String(teacherClassDraft.standard || '').trim();
  const teacherSections = teacherSelectedStandard ? (classSectionsMap[teacherSelectedStandard] || []) : [];

  return (
    <div className="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl font-bold border-2 border-white/30 shadow-lg overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  formData.name?.charAt(0) || 'U'
                )}
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/10 border-b-2 border-white/30 focus:border-white outline-none text-2xl font-bold px-1 w-full"
                  />
                ) : (
                  <h2 className="text-2xl font-bold tracking-tight truncate max-w-[300px]" title={formData.name}>{formData.name}</h2>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="px-2.5 py-0.5 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    {user.role?.replace('_', ' ')}
                  </span>
                  <span className={`w-1 h-1 rounded-full ${memberStatus.dotClass}`}></span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${memberStatus.labelClass}`}>{memberStatus.label}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={updateUserMutation.isPending || updateTeacherExpectedSalaryMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-white text-blue-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg disabled:opacity-50 shrink-0"
                >
                  <FaSave size={14} />
                  {(updateUserMutation.isPending || updateTeacherExpectedSalaryMutation.isPending) ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all shrink-0">
                <FaTimes size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-50/30">
          {saveError && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {saveError}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Basic Info & Badges */}
            <div className="lg:col-span-1 space-y-6">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Identity & Contact
              </h4>
              <div className="space-y-3">
                {/* ID / Department / Standard Card */}
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isAdmin ? 'bg-purple-50 text-purple-600' : isTeacher ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'}`}>
                    {isAdmin ? <FaBuilding /> : isTeacher ? <FaChalkboardTeacher /> : <FaIdCard />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                      {isAdmin ? 'Department' : isTeacher ? 'Standard' : 'Roll Number'}
                    </p>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full bg-gray-50 rounded px-3 py-1.5 text-sm font-black outline-none border border-gray-100 focus:border-blue-300 transition-all"
                        value={isAdmin ? formData.profile?.department : isStudent ? formData.profile?.rollNumber : getTeacherClass()}
                        readOnly={isTeacher} // Teacher class editing usually handled elsewhere
                        onChange={(e) => {
                          if (isAdmin) setFormData({ ...formData, profile: { ...formData.profile, department: e.target.value } });
                          if (isStudent) setFormData({ ...formData, profile: { ...formData.profile, rollNumber: e.target.value.replace(/\D/g, '') } });
                        }}
                      />
                    ) : (
                      <span className="text-sm font-black text-gray-900 break-all">
                        {isAdmin ? formatValue(formData.profile?.department) : isTeacher ? getTeacherClass() : (formData.profile?.rollNumber || `#${user._id?.slice(-6)?.toUpperCase()}`)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><FaEnvelope /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email Address</p>
                    {isEditing ? (
                      <input
                        type="email"
                        className="w-full bg-gray-50 rounded px-3 py-1.5 text-sm font-black outline-none border border-gray-100 focus:border-blue-300 transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    ) : (
                      <span className="text-sm font-black text-gray-900 break-all" title={formData.email}>{formData.email}</span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><FaPhone /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Contact Number</p>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full bg-gray-50 rounded px-3 py-1.5 text-sm font-black outline-none border border-gray-100 focus:border-blue-300 transition-all"
                        value={formData.contactNo}
                        onChange={(e) => setFormData({ ...formData, contactNo: e.target.value.replace(/\D/g, '') })}
                      />
                    ) : (
                      <span className="text-sm font-black text-gray-900 break-all">{formatValue(formData.contactNo)}</span>
                    )}
                  </div>
                </div>

                {isTeacher && (
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><FaWallet /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Salary</p>
                      {isEditing ? (
                        <input
                          type="number"
                          min="101"
                          step="1"
                          className="w-full bg-gray-50 rounded px-3 py-1.5 text-sm font-black outline-none border border-gray-100 focus:border-blue-300 transition-all"
                          value={formData.profile?.expectedSalary ?? ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            profile: {
                              ...formData.profile,
                              expectedSalary: e.target.value === '' ? '' : Number(e.target.value)
                            }
                          })}
                        />
                      ) : (
                        <span className="text-sm font-black text-gray-900 break-all">
                          ₹{Number(formData.profile?.expectedSalary || 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {isStudent && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 text-xs"><FaBuilding /></div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Standard</p>
                      </div>
                      {isEditing ? (
                        <select
                          className="w-full bg-white text-gray-900 rounded px-2 py-1 text-xs font-black outline-none border border-gray-100 focus:border-blue-300 transition-all"
                          style={{ colorScheme: 'light' }}
                          value={formData.profile?.standard}
                          onChange={(e) => {
                            const nextStandard = e.target.value;
                            const allowedSections = classSectionsMap[nextStandard] || [];
                            const nextSection = allowedSections.includes(formData.profile?.section) ? formData.profile?.section : '';
                            setFormData({
                              ...formData,
                              profile: { ...formData.profile, standard: nextStandard, section: nextSection }
                            });
                          }}
                        >
                          <option value="">Standard</option>
                          {standards.map(std => <option key={std} value={std} className="bg-white text-gray-900">{std}</option>)}
                        </select>
                      ) : (
                        <span className="text-sm font-black text-gray-900">{formatValue(formData.profile?.standard)}</span>
                      )}
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 text-xs"><FaLayerGroup /></div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Section</p>
                      </div>
                      {isEditing ? (
                        <select
                          className="w-full bg-white text-gray-900 rounded px-2 py-1 text-xs font-black outline-none border border-gray-100 focus:border-blue-300 transition-all"
                          style={{ colorScheme: 'light' }}
                          value={formData.profile?.section}
                          onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, section: e.target.value } })}
                        >
                          <option value="">Section</option>
                          {sections.map(sec => <option key={sec} value={sec} className="bg-white text-gray-900">{sec}</option>)}
                        </select>
                      ) : (
                        <span className="text-sm font-black text-gray-900">{formatValue(formData.profile?.section)}</span>
                      )}
                    </div>
                  </div>
                )}

                {isTeacher && (
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Classes</p>
                      <span className="text-[10px] font-semibold text-gray-500">{formData.profile?.assignedClasses?.length || 0} total</span>
                    </div>

                    {isEditing && (
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center mb-3">
                        <select
                          className={LIGHT_SELECT_CLASS}
                          style={{ colorScheme: 'light' }}
                          value={teacherClassDraft.standard}
                          onChange={(e) => {
                            const nextStandard = e.target.value;
                            const nextSection = (classSectionsMap[nextStandard] || [])[0] || '';
                            setTeacherClassDraft({ standard: nextStandard, section: nextSection });
                          }}
                        >
                          <option value="">Standard</option>
                          {standards.map(std => <option key={std} value={std} className="bg-white text-gray-900">{std}</option>)}
                        </select>
                        <select
                          className={LIGHT_SELECT_CLASS}
                          style={{ colorScheme: 'light' }}
                          value={teacherClassDraft.section}
                          onChange={(e) => setTeacherClassDraft((prev) => ({ ...prev, section: e.target.value }))}
                          disabled={!teacherSelectedStandard}
                        >
                          <option value="">Section</option>
                          {teacherSections.map(sec => <option key={sec} value={sec} className="bg-white text-gray-900">{sec}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddTeacherClass}
                          disabled={!teacherClassDraft.standard || !teacherClassDraft.section}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {isEditing && (
                      <p className="mb-3 text-[11px] text-slate-500">
                        Teacher can own only one class as class teacher. Choosing a new class replaces the current one.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {(formData.profile?.assignedClasses || []).length === 0 ? (
                        <span className="text-xs text-gray-400">Not Assigned</span>
                      ) : (
                        (formData.profile?.assignedClasses || []).map((cls, index) => (
                          <span
                            key={`${cls.standard}-${cls.section}-${index}`}
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold"
                          >
                            {cls.standard}-{cls.section}
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTeacherClass(cls)}
                                className="text-indigo-500 hover:text-indigo-700"
                              >
                                <FaTimes size={10} />
                              </button>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle/Right Column: Parent & Guardian Details (Student Only) */}
            {isStudent && (
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Family & Guardian Matrix</h4>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button type="button" onClick={() => setGuardianTab('parents')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${guardianTab === 'parents' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                      PARENTS
                    </button>
                    <button type="button" onClick={() => setGuardianTab('guardian')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${guardianTab === 'guardian' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                      GUARDIAN
                    </button>
                  </div>
                </div>

                {guardianTab === 'parents' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                    {/* Father Info */}
                    <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100/50 shadow-sm space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">F</div>
                        <span className="text-sm font-black text-blue-800 uppercase tracking-wider">Father's Details</span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1.5">Full Name</p>
                          {isEditing ? (
                            <input
                              className="w-full bg-white/50 border border-blue-100 focus:border-blue-400 rounded-lg py-2 px-3 text-sm font-bold outline-none"
                              value={formData.profile?.fatherName}
                              onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, fatherName: e.target.value } })}
                            />
                          ) : (
                            <p className="text-sm font-bold text-gray-800">{formatValue(formData.profile?.fatherName)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1.5">
                            Contact Number {isTeacher ? '(optional)' : ''}
                          </p>
                          {isEditing && canViewContacts ? (
                            <input
                              className="w-full bg-white/50 border border-blue-100 focus:border-blue-400 rounded-lg py-2 px-3 text-sm font-bold outline-none"
                              value={formData.profile?.fatherContact}
                              onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, fatherContact: e.target.value.replace(/\D/g, '') } })}
                            />
                          ) : (
                            <p className="text-sm font-bold text-gray-800">
                              {canViewContacts ? formatValue(formData.profile?.fatherContact) : 'Hidden'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mother Info */}
                    <div className="bg-pink-50/30 p-6 rounded-3xl border border-pink-100/50 shadow-sm space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-lg">M</div>
                        <span className="text-sm font-black text-pink-800 uppercase tracking-wider">Mother's Details</span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest leading-none mb-1.5">Full Name</p>
                          {isEditing ? (
                            <input
                              className="w-full bg-white/50 border border-pink-100 focus:border-pink-400 rounded-lg py-2 px-3 text-sm font-bold outline-none"
                              value={formData.profile?.motherName}
                              onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, motherName: e.target.value } })}
                            />
                          ) : (
                            <p className="text-sm font-bold text-gray-800">{formatValue(formData.profile?.motherName)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest leading-none mb-1.5">
                            Contact Number {isTeacher ? '(optional)' : ''}
                          </p>
                          {isEditing && canViewContacts ? (
                            <input
                              className="w-full bg-white/50 border border-pink-100 focus:border-pink-400 rounded-lg py-2 px-3 text-sm font-bold outline-none"
                              value={formData.profile?.motherContact}
                              onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, motherContact: e.target.value.replace(/\D/g, '') } })}
                            />
                          ) : (
                            <p className="text-sm font-bold text-gray-800">
                              {canViewContacts ? formatValue(formData.profile?.motherContact) : 'Hidden'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Guardian Info */
                  <div className="bg-purple-50/30 p-6 rounded-3xl border border-purple-100/50 shadow-sm space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">G</div>
                      <span className="text-sm font-black text-purple-800 uppercase tracking-wider">Guardian Details</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Guardian Name</p>
                        {isEditing ? (
                          <input
                            className="w-full bg-white/50 border border-purple-100 focus:border-purple-400 rounded-lg py-2 px-3 text-sm font-bold outline-none"
                            value={formData.profile?.guardianName}
                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, guardianName: e.target.value } })}
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-800">{formatValue(formData.profile?.guardianName)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">
                          Guardian Contact {isTeacher ? '(optional)' : ''}
                        </p>
                        {isEditing && canViewContacts ? (
                          <input
                            className="w-full bg-white/50 border border-purple-100 focus:border-purple-400 rounded-lg py-2 px-3 text-sm font-bold outline-none"
                            value={formData.profile?.guardianContact}
                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, guardianContact: e.target.value.replace(/\D/g, '') } })}
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-800">
                            {canViewContacts ? formatValue(formData.profile?.guardianContact) : 'Hidden'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If not a student, show placeholder or role description to fill space */}
            {!isStudent && (
              <div className="lg:col-span-2 hidden lg:flex items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center opacity-40 grayscale group hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                <div className="max-w-xs transition-transform group-hover:scale-105">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-50 group-hover:rotate-12 transition-all">
                    {isAdmin ? <FaBuilding className="text-gray-300 group-hover:text-purple-500" size={32} /> : <FaChalkboardTeacher className="text-gray-300 group-hover:text-indigo-500" size={32} />}
                  </div>
                  <h5 className="text-lg font-black text-gray-900 mb-2">Official Record</h5>
                  <p className="text-xs font-medium text-gray-500 leading-relaxed uppercase tracking-wider">Authorized {user.role?.replace('_', ' ')} documents verified and integrated into school registry.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <TeacherConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          onConfirm={handleConfirmConflict}
          conflicts={conflicts}
        />
      </div>
    </div>
  );
};

export default UserDetailModal;
