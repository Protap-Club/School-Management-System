import { useEffect, useMemo, useRef, useState } from 'react';
import { FaBook, FaPaperclip, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import { useUsers } from '../../users/api/queries';
import { useAssignmentOptions } from '../hooks/useAssignmentOptions';
import {
  useAssignmentById,
  useCreateAssignment,
  useRemoveAssignmentAttachment,
  useUpdateAssignment
} from '../api/queries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

const INITIAL_FORM = {
  title: '',
  description: '',
  standard: '',
  sections: [],
  subject: '',
  assignedTeacher: '',
  dueDate: '',
  status: 'active',
};

const getApiErrorMessage = (err) =>
  err.response?.data?.error?.message ||
  err.response?.data?.message ||
  err.response?.data?.errors?.[0]?.message ||
  err.message ||
  'Failed to save assignment';

const normalizeSection = (value) => String(value || '').trim().toUpperCase();

const matchesTeacher = (teacher, standard, section, subject) =>
  (teacher?.profile?.assignedClasses || []).some((item) =>
    String(item?.standard || '').trim() === String(standard || '').trim() &&
    normalizeSection(item?.section) === normalizeSection(section) &&
    (Array.isArray(item?.subjects) ? item.subjects : []).includes(subject)
  );

const InputField = ({ label, name, value, onChange, type = 'text', required = false, error, ...props }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full rounded-lg border px-4 py-2 text-sm shadow-sm outline-none transition-all ${error ? 'border-red-400' : 'border-gray-200 focus:border-indigo-600'}`}
      {...props}
    />
    {error && <p className="text-[11px] text-red-500">{error}</p>}
  </div>
);

const TextAreaField = ({ label, name, value, onChange, required = false, error, ...props }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full rounded-lg border px-4 py-2 text-sm shadow-sm outline-none transition-all ${error ? 'border-red-400' : 'border-gray-200 focus:border-indigo-600'}`}
      rows={4}
      {...props}
    />
    {error && <p className="text-[11px] text-red-500">{error}</p>}
  </div>
);

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  loading = false,
  error = '',
}) => (
  <div className="space-y-1">
    <label className="text-xs font-bold uppercase tracking-tight text-gray-500">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <Select
      value={value?.toString() || ''}
      onValueChange={(next) => onChange({ target: { name, value: next } })}
      disabled={disabled || loading}
    >
      <SelectTrigger className={`h-12 rounded-xl bg-white text-sm font-semibold ${error ? 'border-red-400' : 'border-gray-200'}`}>
        <SelectValue placeholder={loading ? 'Loading...' : placeholder} />
      </SelectTrigger>
      <SelectContent className="z-[150] rounded-xl">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value.toString()}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && <p className="text-[11px] text-red-500">{error}</p>}
  </div>
);

export const AssignmentModal = ({ isOpen, onClose, assignmentToEdit = null }) => {
  const createMutation = useCreateAssignment();
  const updateMutation = useUpdateAssignment();
  const removeAttachmentMutation = useRemoveAssignmentAttachment();
  const { data: detailResponse, isLoading: detailLoading } = useAssignmentById(assignmentToEdit?._id, isOpen && Boolean(assignmentToEdit));
  const teachersQuery = useUsers({ role: 'teacher', pageSize: 5000, enabled: isOpen });
  const { loading: optionsLoading, availableStandards, getSectionsForStandard, getSubjectsForSections } = useAssignmentOptions();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentAttachments, setCurrentAttachments] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(assignmentToEdit);
  const sectionOptions = useMemo(() => getSectionsForStandard(formData.standard), [formData.standard, getSectionsForStandard]);
  const selectedSections = useMemo(() => formData.sections || [], [formData.sections]);
  const subjects = getSubjectsForSections(formData.standard, selectedSections);
  const teachers = useMemo(() => teachersQuery.data?.data?.users || [], [teachersQuery.data?.data?.users]);
  const detailedAssignment = detailResponse?.data;

  const teacherMatchesBySection = useMemo(() => {
    const map = new Map();
    selectedSections.forEach((section) => {
      map.set(
        section,
        teachers.filter((teacher) => matchesTeacher(teacher, formData.standard, section, formData.subject))
      );
    });
    return map;
  }, [formData.standard, formData.subject, selectedSections, teachers]);

  const singleSectionTeachers = useMemo(() => {
    if (selectedSections.length !== 1) return [];
    return teacherMatchesBySection.get(selectedSections[0]) || [];
  }, [selectedSections, teacherMatchesBySection]);

  const teacherOptions = useMemo(() => {
    const options = singleSectionTeachers.map((teacher) => ({ label: teacher.name, value: teacher._id }));
    if (formData.assignedTeacher && !options.some((item) => String(item.value) === String(formData.assignedTeacher))) {
      const current = teachers.find((teacher) => String(teacher._id) === String(formData.assignedTeacher));
      if (current) options.push({ label: current.name, value: current._id });
    }
    return options;
  }, [formData.assignedTeacher, singleSectionTeachers, teachers]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setFieldErrors({});
    setSelectedFiles([]);
    setCurrentAttachments(assignmentToEdit?.attachments || []);

    if (assignmentToEdit) {
      setFormData({
        title: assignmentToEdit.title || '',
        description: assignmentToEdit.description || '',
        standard: assignmentToEdit.standard || '',
        sections: assignmentToEdit.section ? [normalizeSection(assignmentToEdit.section)] : [],
        subject: assignmentToEdit.subject || '',
        assignedTeacher: assignmentToEdit.assignedTeacher?._id || assignmentToEdit.assignedTeacher || '',
        dueDate: assignmentToEdit.dueDate ? new Date(assignmentToEdit.dueDate).toISOString().split('T')[0] : '',
        status: assignmentToEdit.status || 'active',
      });
    } else {
      setFormData({ ...INITIAL_FORM });
    }
  }, [isOpen, assignmentToEdit]);

  useEffect(() => {
    if (detailedAssignment?.attachments) {
      setCurrentAttachments(detailedAssignment.attachments);
    }
  }, [detailedAssignment]);

  useEffect(() => {
    if (!isOpen) return;
    setFormData((current) => {
      let next = current;
      if (current.standard && !availableStandards.includes(current.standard)) {
        return { ...INITIAL_FORM };
      }
      const validSections = (current.sections || []).filter((section) => sectionOptions.includes(section));
      if (validSections.length !== (current.sections || []).length) {
        next = { ...next, sections: validSections, subject: '', assignedTeacher: '' };
      }
      const validSubjects = getSubjectsForSections(next.standard, next.sections || []);
      if (next.subject && !validSubjects.includes(next.subject)) {
        next = { ...next, subject: '', assignedTeacher: '' };
      }
      if (next.sections.length !== 1 && next.assignedTeacher) {
        next = { ...next, assignedTeacher: '' };
      }
      if (!isEditing && next.sections.length === 1 && !next.assignedTeacher && singleSectionTeachers.length === 1) {
        next = { ...next, assignedTeacher: String(singleSectionTeachers[0]._id) };
      }
      return next;
    });
  }, [availableStandards, getSubjectsForSections, isEditing, isOpen, sectionOptions, singleSectionTeachers]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const setFieldError = (name, value = '') =>
    setFieldErrors((prev) => ({ ...prev, [name]: value }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'dueDate' && value && new Date(`${value}T00:00:00`).getDay() === 0) {
      setFieldError('dueDate', 'Sundays are not allowed.');
      return;
    }
    setFieldError(name, '');
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'standard') {
        next.sections = [];
        next.subject = '';
        next.assignedTeacher = '';
      }
      if (name === 'subject') {
        next.assignedTeacher = '';
      }
      return next;
    });
  };

  const toggleSection = (section) => {
    const normalized = normalizeSection(section);
    setFieldError('sections', '');
    setFormData((prev) => {
      const nextSections = prev.sections.includes(normalized)
        ? prev.sections.filter((item) => item !== normalized)
        : [...prev.sections, normalized];
      return { ...prev, sections: nextSections, subject: '', assignedTeacher: '' };
    });
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.title.trim()) nextErrors.title = 'Title is required.';
    if (!formData.description.trim()) nextErrors.description = 'Description is required.';
    if (!formData.standard) nextErrors.standard = 'Class is required.';
    if (selectedSections.length === 0) nextErrors.sections = 'Select at least one section.';
    if (!formData.subject) nextErrors.subject = 'Subject is required.';
    if (!formData.dueDate) nextErrors.dueDate = 'Due date is required.';
    if (selectedSections.length === 1 && !formData.assignedTeacher) {
      nextErrors.assignedTeacher = 'Assigned teacher is required.';
    }
    if (!isEditing && selectedSections.length > 1) {
      const unresolved = selectedSections.filter((section) => (teacherMatchesBySection.get(section) || []).length !== 1);
      if (unresolved.length) {
        nextErrors.sections = `Each selected section needs one mapped teacher for ${formData.subject || 'this subject'}. Check: ${unresolved.join(', ')}.`;
      }
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5));
  };

  const removeFile = (index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const handleRemoveExistingAttachment = async (publicId) => {
    if (!assignmentToEdit?._id) return;
    try {
      await removeAttachmentMutation.mutateAsync({ id: assignmentToEdit._id, publicId });
      setCurrentAttachments((prev) => prev.filter((file) => file.publicId !== publicId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);

    try {
      const payload = new FormData();
      payload.append('title', formData.title.trim());
      payload.append('description', formData.description.trim());
      payload.append('dueDate', formData.dueDate);

      if (isEditing) {
        payload.append('status', formData.status);
        if (formData.assignedTeacher) payload.append('assignedTeacher', formData.assignedTeacher);
      } else {
        payload.append('standard', formData.standard);
        payload.append('subject', formData.subject);
        payload.append('sections', JSON.stringify(selectedSections));
        if (selectedSections.length === 1 && formData.assignedTeacher) {
          payload.append('assignedTeacher', formData.assignedTeacher);
        }
      }

      selectedFiles.forEach((file) => payload.append('attachments', file));

      if (isEditing) {
        await updateMutation.mutateAsync({ id: assignmentToEdit._id, formData: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Assignment' : 'New Assignment'}</h3>
            <p className="text-xs text-gray-500">Students will always be required to upload a submission file.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600">
            <FaTimes size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50/30 p-8">
          {error && <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          <form id="assignment-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Assignment Overview</h4>
              <InputField label="Title" name="title" value={formData.title} onChange={handleChange} error={fieldErrors.title} required />
              <TextAreaField label="Description" name="description" value={formData.description} onChange={handleChange} error={fieldErrors.description} required />
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Class, Sections & Teacher</h4>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <SelectField
                  label="Class"
                  name="standard"
                  value={formData.standard}
                  onChange={handleChange}
                  options={availableStandards.map((item) => ({ label: `Class ${item}`, value: item }))}
                  placeholder="Select Class"
                  loading={optionsLoading}
                  disabled={isEditing}
                  error={fieldErrors.standard}
                  required
                />
                <SelectField
                  label="Subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  options={subjects.map((item) => ({ label: item, value: item }))}
                  placeholder={selectedSections.length ? 'Select Subject' : 'Select Section First'}
                  loading={optionsLoading}
                  disabled={isEditing || selectedSections.length === 0}
                  error={fieldErrors.subject}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-tight text-gray-500">Sections <span className="text-red-500">*</span></label>
                  {!isEditing && sectionOptions.length > 0 && (
                    <div className="flex gap-3 text-[11px] font-semibold">
                      <button type="button" className="text-indigo-600" onClick={() => setFormData((prev) => ({ ...prev, sections: [...sectionOptions], subject: '', assignedTeacher: '' }))}>Select All</button>
                      <button type="button" className="text-slate-500" onClick={() => setFormData((prev) => ({ ...prev, sections: [], subject: '', assignedTeacher: '' }))}>Clear</button>
                    </div>
                  )}
                </div>
                <div className={`rounded-xl border bg-white p-3 ${fieldErrors.sections ? 'border-red-300' : 'border-gray-200'}`}>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedSections.map((section) => (
                        <span key={section} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">Section {section}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {sectionOptions.length === 0 && <span className="text-sm text-gray-500">Select a class to load sections.</span>}
                      {sectionOptions.map((section) => {
                        const selected = selectedSections.includes(section);
                        return (
                          <button
                            key={section}
                            type="button"
                            onClick={() => toggleSection(section)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${selected ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40'}`}
                          >
                            Section {section}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {fieldErrors.sections && <p className="text-[11px] text-red-500">{fieldErrors.sections}</p>}
              </div>

              <SelectField
                label="Assigned Teacher"
                name="assignedTeacher"
                value={formData.assignedTeacher}
                onChange={handleChange}
                options={teacherOptions}
                placeholder={!formData.subject ? 'Select Subject First' : 'Select Teacher'}
                loading={teachersQuery.isLoading}
                disabled={selectedSections.length !== 1}
                error={fieldErrors.assignedTeacher}
                required
              />

              {selectedSections.length === 1 && formData.subject && singleSectionTeachers.length === 1 && (
                <p className="text-xs text-emerald-600">Responsible teacher auto-selected from the subject mapping.</p>
              )}

              {!isEditing && selectedSections.length > 1 && formData.subject && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Teacher Preview</p>
                  <p className="mb-3 text-xs text-slate-500">A separate assignment will be created for each selected section.</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {selectedSections.map((section) => {
                      const matches = teacherMatchesBySection.get(section) || [];
                      const valid = matches.length === 1;
                      return (
                        <div key={section} className={`rounded-xl border px-4 py-3 ${valid ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Section {section}</p>
                          <p className={`mt-1 text-sm font-semibold ${valid ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {valid ? matches[0].name : 'Needs one unique mapped teacher'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">Submission is mandatory</p>
              <p className="text-xs text-gray-500">Students must upload one PDF, JPG, or JPEG file while submitting.</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Attachments (Optional)</h4>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-6 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/30"
              >
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
                  <FaPaperclip size={16} />
                </div>
                <p className="text-sm font-medium text-gray-600">Click to upload documents</p>
                <p className="text-[10px] text-gray-400">Up to 5 files, 10MB each</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
              </div>

              {isEditing && currentAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Existing attachments</p>
                  {currentAttachments.map((file) => (
                    <div key={file.publicId} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded bg-indigo-50 p-2 text-indigo-600"><FaBook size={12} /></div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-700">{file.originalName || file.name}</p>
                          <p className="text-[10px] uppercase text-gray-400">{file.fileType || 'file'}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemoveExistingAttachment(file.publicId)} className="p-1 text-gray-400 hover:text-red-500">
                        <FaTrash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded bg-indigo-50 p-2 text-indigo-600"><FaBook size={12} /></div>
                        <span className="max-w-[220px] truncate text-sm font-medium text-gray-700">{file.name}</span>
                      </div>
                      <button type="button" onClick={() => removeFile(index)} className="p-1 text-gray-400 hover:text-red-500">
                        <FaTrash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Deadline & Status</h4>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <InputField
                  label="Due Date"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  min={isEditing ? undefined : todayStr}
                  error={fieldErrors.dueDate}
                  required
                />
                {isEditing && (
                  <SelectField
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={[
                      { label: 'Active', value: 'active' },
                      { label: 'Closed', value: 'closed' },
                    ]}
                    placeholder="Select Status"
                    required
                  />
                )}
              </div>
            </div>

            {isEditing && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Submission Snapshot</h4>
                {detailLoading ? (
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-4 text-sm text-gray-500">Loading submission details...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Submission</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-900">Required</p>
                      </div>
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Assigned Teacher</p>
                        <p className="mt-1 text-sm font-semibold text-indigo-900">{detailedAssignment?.assignedTeacher?.name || 'Not assigned'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Submissions</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{detailedAssignment?.submissions?.length || 0}</p>
                      </div>
                    </div>
                    {detailedAssignment?.submissions?.length > 0 ? (
                      <div className="space-y-2">
                        {detailedAssignment.submissions.map((submission) => (
                          <div key={submission._id} className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{submission.student?.name || 'Student'}</p>
                                <p className="text-xs text-gray-500">{submission.student?.email || 'No email available'}</p>
                              </div>
                              <p className="text-xs text-gray-400">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Submitted'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-4 text-sm text-gray-500">No student submissions yet.</div>
                    )}
                  </>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 bg-white px-8 py-5">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            form="assignment-form"
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-all disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>Saving...</> : <><FaSave size={14} /><span>{isEditing ? 'Save Changes' : 'Create Assignment'}</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};
