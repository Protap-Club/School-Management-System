import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import { DAY_MAP_REVERSE } from '../../api/timetable';

/**
 * TimetableModal Component
 * Modal for creating/editing timetable entries
 * 
 * Props:
 * - isOpen: Boolean to show/hide modal
 * - onClose: Callback to close modal
 * - onSave: Callback with entry data when saving
 * - onDelete: Callback with entry to delete
 * - initialData: Existing entry data for editing
 * - slotInfo: { day, slot } - day in short form (Mon), slot is TimeSlot object
 * - teachers: Array of teacher objects with { _id, name }
 * - loading: Boolean for save operation in progress
 */
const TimetableModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  slotInfo,
  teachers = [],
  loading = false
}) => {
  const [formData, setFormData] = useState({
    subject: '',
    teacherId: '',
    roomNumber: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        subject: initialData.subject || '',
        // Handle populated teacherId object or plain string
        teacherId: initialData.teacherId?._id || initialData.teacherId || '',
        roomNumber: initialData.roomNumber || '',
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        subject: '',
        teacherId: '',
        roomNumber: '',
        notes: ''
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};

    // Subject is required for CLASS slots
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    // Teacher is required for CLASS slots
    if (!formData.teacherId) {
      newErrors.teacherId = 'Please select a teacher';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    // Build entry data matching backend schema
    // Use undefined instead of null for optional fields (backend expects string | undefined)
    const entryData = {
      dayOfWeek: slotInfo.day, // Already in short form (Mon, Tue, etc.)
      timeSlotId: slotInfo.slot._id || slotInfo.slot.slotNumber, // Support default slots without _id
      subject: formData.subject.trim(),
      teacherId: formData.teacherId,
      ...(formData.roomNumber.trim() && { roomNumber: formData.roomNumber.trim() }),
      ...(formData.notes.trim() && { notes: formData.notes.trim() })
    };

    onSave(entryData, initialData?._id);
  };

  const handleDelete = () => {
    if (initialData?._id) {
      onDelete(initialData._id);
    }
  };

  // Format time display
  const getTimeDisplay = () => {
    if (!slotInfo?.slot) return '';
    return `${slotInfo.slot.startTime} - ${slotInfo.slot.endTime}`;
  };

  // Get full day name for display
  const getDayDisplay = () => {
    const day = slotInfo?.day;
    return DAY_MAP_REVERSE[day] || day;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-primary/5 px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">
            {initialData ? 'Edit Period' : 'Add Period'}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-6 bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            Scheduling for <strong>{getDayDisplay()}</strong> at <strong>{getTimeDisplay()}</strong>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors.subject ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="e.g. Mathematics"
                disabled={loading}
              />
              {errors.subject && (
                <p className="text-red-500 text-xs mt-1">{errors.subject}</p>
              )}
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors.teacherId ? 'border-red-300' : 'border-gray-200'
                  }`}
                disabled={loading}
              >
                <option value="">Select Teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              {errors.teacherId && (
                <p className="text-red-500 text-xs mt-1">{errors.teacherId}</p>
              )}
            </div>

            {/* Room Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Number <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g. 101"
                disabled={loading}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                placeholder="Additional notes..."
                rows={2}
                disabled={loading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              {initialData && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <FaSpinner className="animate-spin" />}
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimetableModal;
