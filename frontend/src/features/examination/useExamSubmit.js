/**
 * useExamSubmit
 *
 * Encapsulates the exam create/update submit logic that was previously
 * inlined as an onSubmit prop inside ExaminationPage.jsx (~180 lines).
 *
 * Handles three distinct flows:
 *  1. editSyllabus — patch syllabus text + upload new attachments per schedule item
 *  2. create       — POST a new exam, then upload any queued attachments
 *  3. edit         — PUT an existing exam, then upload any queued attachments
 */

const sanitizeAttachmentForApi = (attachment = {}) => {
  const sanitized = { url: attachment.url };
  if (attachment.publicId) sanitized.publicId = attachment.publicId;
  if (attachment.name) sanitized.name = attachment.name;
  if (attachment.originalName) sanitized.originalName = attachment.originalName;
  if (attachment.fileType) sanitized.fileType = attachment.fileType;
  if (attachment.mimeType) sanitized.mimeType = attachment.mimeType;
  if (typeof attachment.size === 'number') sanitized.size = attachment.size;
  if (attachment.uploadedAt) sanitized.uploadedAt = attachment.uploadedAt;
  return sanitized;
};

export const useExamSubmit = ({
  showModal,
  setShowModal,
  createExamMutation,
  updateExamMutation,
  patchScheduleSyllabusMutation,
  uploadScheduleAttachmentsMutation,
  showMessage,
}) => {
  const handleExamSubmit = async (data) => {
    const originalSchedule = showModal.data?.schedule || [];
    const originalById = new Map(
      originalSchedule.map((item) => [String(item._id || ''), item])
    );

    const getAttachmentSignature = (attachments = []) =>
      (attachments || [])
        .map((a) => `${a?.publicId || ''}|${a?.url || ''}`)
        .sort()
        .join(',');

    // ─── flow 1: syllabus-only patch ────────────────────────────────────────
    if (showModal.type === 'editSyllabus') {
      const examId = showModal.data?._id;
      if (!examId) {
        showMessage('error', 'Exam not found for syllabus update.');
        return;
      }

      const syllabusPatchQueue = (data.schedule || []).map((item, index) => {
        const scheduleItemId = item._id || originalSchedule?.[index]?._id;
        const originalItem =
          originalById.get(String(scheduleItemId || '')) ||
          originalSchedule?.[index] ||
          {};
        const syllabusChanged =
          String(item.syllabus || '') !== String(originalItem?.syllabus || '');
        const attachmentsChanged =
          getAttachmentSignature(item.attachments || []) !==
          getAttachmentSignature(originalItem?.attachments || []);

        return {
          index,
          scheduleItemId,
          shouldPatch:
            Boolean(scheduleItemId) && (syllabusChanged || attachmentsChanged),
          syllabus: item.syllabus || '',
          attachments: item.attachments || [],
          attachmentFiles: item.attachmentFiles || [],
        };
      });

      try {
        for (const item of syllabusPatchQueue) {
          if (item.shouldPatch) {
            await patchScheduleSyllabusMutation.mutateAsync({
              examId,
              scheduleItemId: item.scheduleItemId,
              updateData: {
                syllabus: item.syllabus,
                attachments: (item.attachments || []).map(sanitizeAttachmentForApi),
                // If we'll also upload new files right after, suppress the
                // duplicate notice broadcast from this patch call.
                suppressNotice: item.attachmentFiles.length > 0,
              },
            });
          }

          if (item.attachmentFiles.length > 0) {
            if (!item.scheduleItemId) {
              throw new Error(`Missing schedule item id for paper #${item.index + 1}`);
            }
            await uploadScheduleAttachmentsMutation.mutateAsync({
              examId,
              scheduleItemId: item.scheduleItemId,
              files: item.attachmentFiles,
            });
          }
        }
      } catch (error) {
        console.error('Syllabus update failed:', error);
        showMessage(
          'error',
          error.response?.data?.message ||
            error.response?.data?.error?.message ||
            error.message ||
            'Failed to update syllabus'
        );
        return;
      }

      showMessage('success', 'Exam syllabus and attachments updated successfully');
      setShowModal({ type: '', open: false, data: null });
      return;
    }

    // ─── flows 2 & 3: create / edit ─────────────────────────────────────────

    // Build the queue of schedule items that have new file attachments
    const scheduleAttachmentQueue = (data.schedule || [])
      .map((item, index) => ({
        index,
        files: item.attachmentFiles || [],
        existingScheduleItemId: item._id || '',
      }))
      .filter((entry) => entry.files.length > 0);

    // Strip internal-only `attachmentFiles` field before sending to the API
    const examPayload = {
      ...data,
      schedule: (data.schedule || []).map((item) => {
        const { attachmentFiles: _attachmentFiles, ...safeItem } = item;
        return {
          ...safeItem,
          attachments: (safeItem.attachments || []).map(sanitizeAttachmentForApi),
        };
      }),
    };

    let savedExamId = showModal.data?._id;
    let savedSchedule = [];

    try {
      if (showModal.type === 'create') {
        const createdExamResponse = await createExamMutation.mutateAsync(examPayload);
        savedExamId = createdExamResponse?.data?._id;
        savedSchedule = createdExamResponse?.data?.schedule || [];
      } else {
        const updatedExamResponse = await updateExamMutation.mutateAsync({
          examId: showModal.data._id,
          updateData: examPayload,
        });
        savedExamId = updatedExamResponse?.data?._id || savedExamId;
        savedSchedule = updatedExamResponse?.data?.schedule || [];
      }
    } catch (error) {
      console.error('Failed to save exam:', error);
      let message =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message ||
        'Operation failed';

      const validationErrors =
        error.response?.data?.errors || error.response?.data?.error?.details;
      if (error.response?.status === 422 && validationErrors) {
        if (Array.isArray(validationErrors)) {
          const detail = validationErrors
            .map((e) => `${(e.path || e.field || '').split('.').pop()}: ${e.message}`)
            .join(', ');
          message = `Validation Error: ${detail}`;
        }
      }

      showMessage('error', message);
      return;
    }

    // Upload attachment files that were queued before the exam existed
    if (scheduleAttachmentQueue.length > 0) {
      if (!savedExamId) {
        showMessage(
          'error',
          'Exam was saved, but attachments could not be uploaded because the exam id is missing.'
        );
        setShowModal({ type: '', open: false, data: null });
        return;
      }

      try {
        for (const item of scheduleAttachmentQueue) {
          const mappedScheduleItemId =
            item.existingScheduleItemId || savedSchedule?.[item.index]?._id;

          if (!mappedScheduleItemId) {
            throw new Error(`Missing schedule item id for paper #${item.index + 1}`);
          }

          await uploadScheduleAttachmentsMutation.mutateAsync({
            examId: savedExamId,
            scheduleItemId: mappedScheduleItemId,
            files: item.files,
          });
        }
      } catch (error) {
        console.error('Exam saved but schedule attachment upload failed:', error);
        const uploadMessage =
          error.response?.data?.message ||
          error.response?.data?.error?.message ||
          error.message ||
          'Attachment upload failed';

        showMessage(
          'error',
          `Exam ${showModal.type === 'create' ? 'created' : 'updated'}, but one or more attachments failed: ${uploadMessage}`
        );
        setShowModal({ type: '', open: false, data: null });
        return;
      }
    }

    showMessage(
      'success',
      `Exam ${showModal.type === 'create' ? 'created' : 'updated'} successfully${
        scheduleAttachmentQueue.length > 0 ? ' with paper attachments' : ''
      }`
    );
    setShowModal({ type: '', open: false, data: null });
  };

  return { handleExamSubmit };
};
