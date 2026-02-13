import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import { DAY_MAP_REVERSE } from '../../api/timetable';

const EMPTY_FORM = { subject: '', teacherId: '', roomNumber: '', notes: '' };

const TimetableModal = ({ isOpen, onClose, onSave, onDelete, initialData, slotInfo, teachers = [], loading = false }) => {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(initialData
      ? { subject: initialData.subject || '', teacherId: initialData.teacherId?._id || initialData.teacherId || '', roomNumber: initialData.roomNumber || '', notes: initialData.notes || '' }
      : { ...EMPTY_FORM }
    );
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const updateField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const validate = () => {
    const newErrors = {};
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.teacherId) newErrors.teacherId = 'Please select a teacher';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const entryData = {
      dayOfWeek: slotInfo.day,
      timeSlotId: slotInfo.slot._id || slotInfo.slot.slotNumber,
      subject: formData.subject.trim(),
      teacherId: formData.teacherId,
      ...(formData.roomNumber.trim() && { roomNumber: formData.roomNumber.trim() }),
      ...(formData.notes.trim() && { notes: formData.notes.trim() })
    };
    onSave(entryData, initialData?._id);
  };

  const timeDisplay = slotInfo?.slot ? `${slotInfo.slot.startTime} - ${slotInfo.slot.endTime}` : '';
  const dayDisplay = DAY_MAP_REVERSE[slotInfo?.day] || slotInfo?.day;

  const FORM_FIELDS = [
    { key: 'subject', label: 'Subject', required: true, type: 'input', placeholder: 'e.g. Mathematics' },
    { key: 'teacherId', label: 'Teacher', required: true, type: 'select' },
    { key: 'roomNumber', label: 'Room Number', required: false, type: 'input', placeholder: 'e.g. 101' },
    { key: 'notes', label: 'Notes', required: false, type: 'textarea', placeholder: 'Additional notes...' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-primary/5 px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">{initialData ? 'Edit Period' : 'Add Period'}</h3>
          <button onClick={onClose} disabled={loading} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"><FaTimes /></button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-6 bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            Scheduling for <strong>{dayDisplay}</strong> at <strong>{timeDisplay}</strong>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {FORM_FIELDS.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required ? <span className="text-red-500">*</span> : <span className="text-gray-400">(Optional)</span>}
                </label>
                {field.type === 'select' ? (
                  <select value={formData[field.key]} onChange={(e) => updateField(field.key, e.target.value)} disabled={loading}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors[field.key] ? 'border-red-300' : 'border-gray-200'}`}>
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea value={formData[field.key]} onChange={(e) => updateField(field.key, e.target.value)} disabled={loading}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    placeholder={field.placeholder} rows={2} />
                ) : (
                  <input type="text" value={formData[field.key]} onChange={(e) => updateField(field.key, e.target.value)} disabled={loading}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors[field.key] ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder={field.placeholder} />
                )}
                {errors[field.key] && <p className="text-red-500 text-xs mt-1">{errors[field.key]}</p>}
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              {initialData && (
                <button type="button" onClick={() => initialData?._id && onDelete(initialData._id)} disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50">Delete</button>
              )}
              <button type="button" onClick={onClose} disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <FaSpinner className="animate-spin" />}{loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimetableModal;
