import React, { useState, useEffect } from 'react';
import {
  FaTimes, FaIdCard, FaBuilding, FaLayerGroup, FaEnvelope, FaPhone, FaSave, FaUser, FaTrash, FaChalkboardTeacher
} from 'react-icons/fa';
import api from '../../../lib/axios';
import { useUpdateUser } from '../api/queries';

const naturalSort = (arr) => {
  return [...arr].sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
};

const UserDetailModal = ({ user, onClose, initialMode = 'view', onSuccess }) => {
  const updateUserMutation = useUpdateUser();
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({});
  const [guardianTab, setGuardianTab] = useState('parents');
  const [standards, setStandards] = useState([]);
  const [sections, setSections] = useState([]);

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
    }
  }, [user, initialMode]);

  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const isEditing = mode === 'edit';

  useEffect(() => {
    if (isEditing && (isStudent || isTeacher)) {
      const fetchClasses = async () => {
        try {
          const response = await api.get('/school/classes');
          const data = response.data?.data;
          
          let localData = { standards: [], sections: [] };
          try {
            const stored = localStorage.getItem('school_custom_classes');
            if (stored) localData = JSON.parse(stored);
          } catch (e) {
            console.error('Failed to parse local classes', e);
          }
          
          setStandards(naturalSort(Array.from(new Set([...(data?.standards || []), ...(localData.standards || [])]))));
          setSections(naturalSort(Array.from(new Set([...(data?.sections || []), ...(localData.sections || [])]))));
        } catch {
          let localData = { standards: [], sections: [] };
          try {
            const stored = localStorage.getItem('school_custom_classes');
            if (stored) localData = JSON.parse(stored);
          } catch (e) {
            console.error('Failed to parse local classes', e);
          }
          setStandards(naturalSort(localData.standards || []));
          setSections(naturalSort(localData.sections || []));
        }
      };
      fetchClasses();
    }
  }, [isEditing, isStudent, isTeacher]);

  if (!user) return null;

  const handleSave = async () => {
    try {
      await updateUserMutation.mutateAsync({ ...user, ...formData });
      if (onSuccess) onSuccess('User updated successfully');
      setMode('view');
    } catch (error) {
      console.error('Update failed', error);
    }
  };
  // Helper to get teacher's primary class
  const getTeacherClass = () => {
    const classes = formData.profile?.assignedClasses || [];
    if (classes.length > 0) {
      return `${classes[0].standard}${classes[0].section}`;
    }
    return 'Not Assigned';
  };

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
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  <span className="text-blue-100 text-xs font-bold uppercase tracking-widest">Active Member</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={updateUserMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-white text-blue-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg disabled:opacity-50 shrink-0"
                >
                  <FaSave size={14} />
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                        {isAdmin ? (formData.profile?.department || 'Not Provided') : isTeacher ? getTeacherClass() : (formData.profile?.rollNumber || `#${user._id?.slice(-6)?.toUpperCase()}`)}
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
                      <span className="text-sm font-black text-gray-900 break-all">{formData.contactNo || 'Not Provided'}</span>
                    )}
                  </div>
                </div>

                {isStudent && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 text-xs"><FaBuilding /></div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Standard</p>
                      </div>
                      {isEditing ? (
                        <select
                          className="w-full bg-gray-50 rounded px-2 py-1 text-xs font-black outline-none border border-gray-100 focus:border-blue-300 transition-all"
                          value={formData.profile?.standard}
                          onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, standard: e.target.value } })}
                        >
                          <option value="" disabled hidden>Standard</option>
                          {standards.map(std => <option key={std} value={std}>{std}</option>)}
                        </select>
                      ) : (
                        <span className="text-sm font-black text-gray-900">{formData.profile?.standard || 'N/A'}</span>
                      )}
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 text-xs"><FaLayerGroup /></div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Section</p>
                      </div>
                      {isEditing ? (
                        <select
                          className="w-full bg-gray-50 rounded px-2 py-1 text-xs font-black outline-none border border-gray-100 focus:border-blue-300 transition-all"
                          value={formData.profile?.section}
                          onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, section: e.target.value } })}
                        >
                          <option value="" disabled hidden>Section</option>
                          {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                        </select>
                      ) : (
                        <span className="text-sm font-black text-gray-900">{formData.profile?.section || 'N/A'}</span>
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
                            <p className="text-sm font-bold text-gray-800">{formData.profile?.fatherName || 'Not Provided'}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1.5">Contact Number</p>
                          {isEditing ? (
                            <input
                              className="w-full bg-white/50 border border-blue-100 focus:border-blue-400 rounded-lg py-2 px-3 text-sm font-bold outline-none"
                              value={formData.profile?.fatherContact}
                              onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, fatherContact: e.target.value.replace(/\D/g, '') } })}
                            />
                          ) : (
                            <p className="text-sm font-bold text-gray-800">{formData.profile?.fatherContact || 'Not Provided'}</p>
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
                            <p className="text-sm font-bold text-gray-800">{formData.profile?.motherName || 'Not Provided'}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest leading-none mb-1.5">Contact Number</p>
                          {isEditing ? (
                            <input
                              className="w-full bg-white/50 border border-pink-100 focus:border-pink-400 rounded-lg py-2 px-3 text-sm font-bold outline-none"
                              value={formData.profile?.motherContact}
                              onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, motherContact: e.target.value.replace(/\D/g, '') } })}
                            />
                          ) : (
                            <p className="text-sm font-bold text-gray-800">{formData.profile?.motherContact || 'Not Provided'}</p>
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
                          <p className="text-sm font-bold text-gray-800">{formData.profile?.guardianName || 'Not Provided'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Guardian Contact</p>
                        {isEditing ? (
                          <input
                            className="w-full bg-white/50 border border-purple-100 focus:border-purple-400 rounded-lg py-2 px-3 text-sm font-bold outline-none"
                            value={formData.profile?.guardianContact}
                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, guardianContact: e.target.value.replace(/\D/g, '') } })}
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-800">{formData.profile?.guardianContact || 'Not Provided'}</p>
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
      </div>
    </div>
  );
};

export default UserDetailModal;
