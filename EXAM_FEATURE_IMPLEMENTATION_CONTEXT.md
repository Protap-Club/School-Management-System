# Exam Syllabus + Attachments + Notice Broadcast Implementation Context

Last updated: 2026-04-06

## 1) Feature Goal

Implement a complete exam syllabus management flow where:

- Syllabus is managed at **paper/schedule-item level** (not only exam-level).
- Multiple syllabus attachments can be uploaded per paper.
- Attachments and syllabus persist across exam views for admins, teachers, and students (students are read-only).
- Authorized staff can edit syllabus/attachments after exam creation.
- Publishing and published updates trigger in-app notice broadcasts with full exam details.
- Attachment upload UX is clear and supports expected file types in picker and validation.

## 2) Expected Requirements (Mapped)

### A. Attachment UX in exam creation/edit

- Upload control under `Specific Syllabus / Topics` per schedule paper.
- Multiple attachments supported per paper.
- Attachment names displayed.
- Clear, larger delete button for existing and pending attachments.
- Supported file types for schedule attachments now aligned to:
  - `JPG, JPEG, PDF, PNG, DOC, DOCX, XLSX, XLS, CSV, TXT`

### B. Visibility and permission rules

- Students: can view syllabus/attachments via exams/notices; cannot edit.
- Admin/super_admin: full edit rights.
- Teachers:
  - Full exam edit for existing privileged path.
  - Syllabus-only edit path for authorized class-subject teachers and schedule-assigned teachers.

### C. Notification behavior

- On publish (`DRAFT -> PUBLISHED`), create combined notice with full exam paper details.
- On syllabus/attachment updates to a published exam, create updated combined notice.
- Recipient fan-out:
  - Students via class-targeted notice (`recipientType: "classes"`, e.g. `10-A`).
  - Admins + relevant teachers via user-targeted notice (`recipientType: "users"`).

## 3) Backend Design and API Contracts

### New/updated endpoints

- `POST /examinations/:id/schedule/:scheduleItemId/attachments`
  - multi-upload per paper
  - 10 files max, each <= 10MB
- `PATCH /examinations/:id/schedule/:scheduleItemId/syllabus`
  - update per-paper syllabus text and attachment array
- Existing kept:
  - `POST /examinations/:id/syllabus-document`
  - `GET /examinations/my-exams`
  - `PATCH /examinations/:id/status`

Reference:
- `backend/src/module/examination/examination.route.js` lines around 174, 186, 125

### Validation

- Schedule item supports `attachments[]` metadata.
- Added param schema for schedule attachment route.
- Added body schema for schedule syllabus patch.

Reference:
- `backend/src/module/examination/examination.validation.js` lines around 23, 42, 126, 133

### Data model

- Added schedule attachment sub-schema and `schedule[].attachments`.
- Added/retained `syllabusDocument` schema at exam level.

Reference:
- `backend/src/module/examination/Exam.model.js` lines around 8, 84, 92, 177

### Authorization logic

- Added syllabus edit guard `assertCanEditScheduleSyllabus(...)`:
  - allows admin/super_admin
  - teacher must match class-section and subject assignment
  - schedule-assigned teacher also allowed

Reference:
- `backend/src/module/examination/examination.service.js` line ~229

### Notice broadcast logic

- Added helpers:
  - `buildExamNoticeTitle(...)`
  - `buildExamNoticeMessage(...)`
  - `resolveExamNoticeRecipients(...)`
  - `createExamNoticeBroadcast(...)`
- Trigger points:
  - on publish in `updateStatus(...)`
  - on schedule update in `updateExam(...)` when published
  - on `uploadScheduleAttachments(...)` when published
  - on `patchScheduleSyllabus(...)` when published

Reference:
- `backend/src/module/examination/examination.service.js` lines around 132, 139, 174, 277, 530, 572, 610, 756, 786

### Admin notice receive logic

- Admin/super_admin received notices now include:
  - `recipientType: "all"`
  - `recipientType: "users"` addressed to that admin
  - existing teacher-origin visibility behavior retained

Reference:
- `backend/src/module/notice/notice.service.js` lines around 248, 262, 263

## 4) Frontend Design and Behavior

### Exam modal (`ExamModal`) updates

- Added per-paper `attachments` and `attachmentFiles` state fields.
- Added attachment upload UI under paper syllabus area.
- Added pending + current attachments rendering.
- Added removal handlers for both pending and existing attachments.
- Added format + size validation and upload `accept` string.
- Added `syllabusOnly` mode to reuse modal for focused syllabus editing.
- Resolved React hook/lint issues (setState in effect and ref-read during render pattern).

Reference:
- `frontend/src/components/examination/ExamModal.jsx`
  - `SCHEDULE_ATTACHMENT_ACCEPT` line ~197
  - `handleScheduleAttachmentChange` line ~386
  - `removePendingAttachment` line ~401
  - `removeExistingAttachment` line ~415
  - `syllabusOnly` mode usage lines ~200, ~520, ~756, ~1039
  - Upload UI lines ~923-940

### Examination page updates

- Added API hooks:
  - `useUploadScheduleAttachments`
  - `usePatchScheduleSyllabus`
- Added syllabus-only entry action for teachers (`Edit Syllabus & Attachments`).
- Added permission helper `canTeacherEditSyllabus(...)`.
- Submission flow now:
  - patches changed syllabus/attachments per schedule item
  - uploads new files separately per schedule item
  - supports both create/edit and syllabus-only edit flows
- Exam detail view renders schedule attachments for visibility.

Reference:
- `frontend/src/features/examination/ExaminationPage.jsx`
  - hooks lines ~5, ~118, ~119
  - permission helper line ~188
  - syllabus-only action line ~539
  - patch/upload flow lines ~736, ~763, ~777, ~872
  - modal in syllabusOnly mode lines ~901-902
  - attachments in detail card line ~675

### Frontend API layer

- Added `uploadScheduleAttachments(...)` request.
- Added `patchScheduleSyllabus(...)` request.
- Added matching react-query mutation hooks.

Reference:
- `frontend/src/features/examination/api/api.js` lines ~54, ~72
- `frontend/src/features/examination/api/queries.js` lines ~92, ~105

## 5) Attachment Type Handling (Current)

For **schedule attachments** (paper-level syllabus docs), allowed types are currently:

- MIME/extensions: `jpg, jpeg, pdf, png, doc, docx, xlsx, xls, csv, txt`
- Frontend file picker `accept`:
  - `.jpg,.jpeg,.pdf,.png,.doc,.docx,.xlsx,.xls,.csv,.txt`

Reference:
- `frontend/src/components/examination/ExamModal.jsx` lines ~184, ~196, ~197, ~940
- `backend/src/module/examination/examination.route.js` lines ~38, ~50, ~97

## 6) File-by-File Change List (Git Working Tree)

- `backend/src/module/examination/Exam.model.js`
- `backend/src/module/examination/examination.controller.js`
- `backend/src/module/examination/examination.route.js`
- `backend/src/module/examination/examination.service.js`
- `backend/src/module/examination/examination.validation.js`
- `backend/src/module/notice/notice.service.js`
- `frontend/src/components/examination/ExamModal.jsx`
- `frontend/src/features/examination/ExaminationPage.jsx`
- `frontend/src/features/examination/api/api.js`
- `frontend/src/features/examination/api/queries.js`
- `frontend/src/features/notices/NoticePage.jsx` (single text-line change in attachment help text)

Numstat snapshot for these files:

- `Exam.model.js` `+87 -10`
- `examination.controller.js` `+43 -0`
- `examination.route.js` `+140 -16`
- `examination.service.js` `+416 -5`
- `examination.validation.js` `+31 -0`
- `notice.service.js` `+9 -7`
- `ExamModal.jsx` `+342 -100`
- `ExaminationPage.jsx` `+344 -121`
- `api.js` `+27 -0`
- `queries.js` `+26 -0`
- `NoticePage.jsx` `+1 -1`

## 7) Key Code Blocks Added/Changed

### A) New schedule syllabus patch route

```js
router.patch(
  "/:id/schedule/:scheduleItemId/syllabus",
  checkWebOnly,
  checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
  validate(scheduleSyllabusUpdateSchema),
  patchScheduleSyllabus
);
```

Location:
- `backend/src/module/examination/examination.route.js` line ~186

### B) Syllabus edit authorization helper

```js
const assertCanEditScheduleSyllabus = async (schoolId, exam, user, scheduleItem) => {
  // admin/super_admin allowed
  // teacher must match class-section
  // and either be schedule-assigned teacher OR subject-mapped teacher
};
```

Location:
- `backend/src/module/examination/examination.service.js` line ~229

### C) Published exam notice fan-out

```js
await Notice.create({ recipientType: "classes", recipients: [classKey], ... });
await Notice.create({ recipientType: "users", recipients: userRecipients, ... });
```

Location:
- `backend/src/module/examination/examination.service.js` line ~277 onward

### D) Frontend schedule attachment accept config

```js
const SCHEDULE_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.pdf,.png,.doc,.docx,.xlsx,.xls,.csv,.txt";
```

Location:
- `frontend/src/components/examination/ExamModal.jsx` line ~197

### E) Syllabus-only modal mode from exam list

```jsx
<ExamModal
  editData={showModal.type === 'edit' || showModal.type === 'editSyllabus' ? showModal.data : null}
  syllabusOnly={showModal.type === 'editSyllabus'}
/>
```

Location:
- `frontend/src/features/examination/ExaminationPage.jsx` lines ~901-902

## 8) Test/Verification Notes

What was checked:

- Backend syntax check for exam route passed:
  - `node --check backend/src/module/examination/examination.route.js`

Known unrelated issue during full frontend production build:

- `vite build` failed due unresolved entry module `recharts` in current workspace setup.
- This appears unrelated to this exam feature change set.

## 9) Known Gaps / Follow-ups

- `POST /:id/syllabus-document` invalid-file error message text in route still contains old unrelated formats (`RTF, ODT, MP4...`) and should be cleaned for consistency.
- `frontend/src/features/notices/NoticePage.jsx` attachment support text includes more formats than schedule attachment route; align copy with actual allowed formats if desired.
- End-to-end matrix testing is still recommended:
  - admin, super_admin, teacher (allowed), teacher (not allowed), student
  - publish notice and published-update notice content
  - add/remove attachments across multiple schedule items

## 10) Quick Outcome Summary

This implementation now supports per-paper syllabus + attachment management, role-aware syllabus editing, persistent visibility across exam consumers, and automatic exam notice broadcasts with full paper details. The latest upload-picker issue for PDFs has been fixed in both frontend accept config and backend schedule attachment allowlist.

