  import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaSpinner, FaChevronDown, FaSearch } from 'react-icons/fa';
import { DAY_MAP_REVERSE } from '..';

const EMPTY_FORM = { subject: '', teacherId: '', roomNumber: '', notes: '' };

const SearchableSelect = ({ label, value, onChange, options, placeholder, required, error, loading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required ? <span className="text-red-500">*</span> : <span className="text-gray-400">(Optional)</span>}
      </label>
      <div
        onClick={() => !loading && setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'ring-2 ring-primary/20 border-primary bg-white' : 'border-gray-200 bg-gray-50/30 hover:bg-white'
          } ${error ? 'border-red-300' : ''} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate ${!value ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
          {value || placeholder}
        </span>
        <FaChevronDown className={`text-gray-400 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn">
          <div className="p-2 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
            <FaSearch className="text-gray-400 text-sm ml-2" />
            <input
              autoFocus
              type="text"
              className="w-full bg-transparent border-none focus:ring-0 text-sm py-1"
              placeholder="Search or type new..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onChange(e.target.value); // Allow typing new value
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm) {
                  onChange(searchTerm);
                  setIsOpen(false);
                }
              }}
            />
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar font-medium">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="px-4 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <span>{opt}</span>
                  {value === opt && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
              ))
            ) : searchTerm ? (
              <div
                onClick={() => {
                  onChange(searchTerm);
                  setIsOpen(false);
                }}
                className="px-4 py-3 text-sm text-primary font-medium hover:bg-primary/5 cursor-pointer italic"
              >
                Add "{searchTerm}" as new
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-gray-400 text-center">No existing options</div>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </div>
  );
};

const TimetableModal = ({
  isOpen, onClose, onSave, onDelete, initialData, slotInfo,
  teachers = [], subjects = [], rooms = [], loading = false
}) => {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(initialData
      ? {
        subject: initialData.subject || '',
        teacherId: initialData.teacherId?._id || initialData.teacherId || '',
        roomNumber: initialData.roomNumber || '',
        notes: initialData.notes || ''
      }
      : { ...EMPTY_FORM }
    );
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

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

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-fadeIn">
        <div className="bg-gradient-to-r from-primary/10 to-transparent px-6 py-5 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{initialData ? 'Edit Period' : 'Add Period'}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Fill in the details for this slot</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all disabled:opacity-50">
            <FaTimes size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-8 flex items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <div className="bg-primary text-white p-2.5 rounded-xl shadow-lg shadow-primary/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-primary/60">Schedule Time</p>
              <p className="text-sm font-semibold text-gray-700">{dayDisplay} • {timeDisplay}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <SearchableSelect
              label="Subject"
              value={formData.subject}
              onChange={(val) => updateField('subject', val)}
              options={subjects}
              placeholder="Select or type subject"
              required
              error={errors.subject}
              loading={loading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.teacherId}
                  onChange={(e) => updateField('teacherId', e.target.value)}
                  disabled={loading}
                  className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none bg-gray-50/30 hover:bg-white font-medium ${errors.teacherId ? 'border-red-300 bg-red-50/10' : 'border-gray-200 text-gray-700'
                    }`}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
                <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
              {errors.teacherId && <p className="text-red-500 text-xs mt-1 ml-1">{errors.teacherId}</p>}
            </div>

            <SearchableSelect
              label="Class (Room)"
              value={formData.roomNumber}
              onChange={(val) => updateField('roomNumber', val)}
              options={rooms}
              placeholder="Select or type room"
              error={errors.roomNumber}
              loading={loading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/30 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm text-gray-700 font-medium"
                placeholder="Additional instructions..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-6">
              {initialData && (
                <button
                  type="button"
                  onClick={() => initialData?._id && onDelete(initialData._id)}
                  disabled={loading}
                  className="px-5 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all border border-red-100 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-3 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover shadow-xl shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {loading ? 'Saving...' : 'Save Period'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimetableModal;
