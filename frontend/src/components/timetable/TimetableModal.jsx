import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const TimetableModal = ({ isOpen, onClose, onSave, onDelete, initialData, slotInfo, teachers = [] }) => {
  const [formData, setFormData] = useState({
    subject: '',
    teacherEmail: '', // Changed ID to Email for mapping with demo data
    room: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        subject: initialData.subject || '',
        teacherEmail: initialData.teacherEmail || '',
        room: initialData.room || '',
      });
    } else {
      setFormData({
        subject: '',
        teacherEmail: '',
        room: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      // teacherEmail is already string, just pass it
    });
    setFormData({ subject: '', teacherEmail: '', room: '' }); // Reset form
    onClose();
  };

  const handleDelete = () => {
    onDelete(initialData); // Pass the entry to delete
    onClose();
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
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-6 bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            Scheduling for <strong>{slotInfo?.day}</strong> at <strong>{slotInfo?.time}</strong>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g. Mathematics"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
              <select
                required
                value={formData.teacherEmail}
                onChange={(e) => setFormData({ ...formData, teacherEmail: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">Select Teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.email} value={teacher.email}>
                    {teacher.name} ({teacher.standard}-{teacher.section || ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room (Optional)</label>
              <input
                type="text"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g. 101"
              />
            </div>

            <div className="flex gap-3 mt-8">
              {initialData && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors border border-red-100"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimetableModal;
