import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatValue } from './index.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCHOOL_NAME = 'Navrachna International School';
const ACADEMIC_YEAR = 'Academic Year 2026';

const MONTH_LABELS = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
};

const COLORS = {
  primary:     [30, 41, 59],    // slate-800
  secondary:   [71, 85, 105],   // slate-600
  muted:       [100, 116, 139], // slate-500
  subtle:      [148, 163, 184], // slate-400
  border:      [226, 232, 240], // slate-200
  bg:          [248, 250, 252], // slate-50
  white:       [255, 255, 255],
  success:     [16, 185, 129],  // emerald-500
  warning:     [245, 158, 11],  // amber-500
  warningBg:   [255, 251, 235], // amber-50
  warningText: [146, 64, 14],   // amber-800
  tableHead:   [79, 70, 229],   // indigo-600
};

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/** Centers text horizontally on the page. */
const centerX = (doc, text) => {
  const pageWidth = doc.internal.pageSize.width;
  return (pageWidth - doc.getTextWidth(text)) / 2;
};

/** Returns the page width for the given doc. */
const pageWidth = (doc) => doc.internal.pageSize.width;

/** Converts 24h "HH:MM" → "HH:MM AM/PM". Passes through if already formatted. */
const formatTime = (t) => {
  if (!t || /am|pm/i.test(t)) return t ?? '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')} ${period}`;
};

/**
 * Draws a two-column page header used by receipts and notes.
 *  Left  → document title
 *  Right → school name + academic year
 */
const drawReceiptHeader = (doc, title, titleColor = COLORS.primary) => {
  const pw = pageWidth(doc);

  // Top accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pw, 4, 'F');

  // Document title (left)
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...titleColor);
  doc.text(title, 14, 22);

  // School name (right)
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text(SCHOOL_NAME, pw - 14, 19, { align: 'right' });

  // Academic year (right)
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(ACADEMIC_YEAR, pw - 14, 27, { align: 'right' });

  // Divider
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(14, 33, pw - 14, 33);
};

/**
 * Draws a two-column details section starting at y=50.
 *  @param {Array<{label:string, value:string}>} leftItems
 *  @param {Array<{label:string, value:string}>} rightItems
 *  @param {string} leftTitle
 *  @param {string} rightTitle
 */
const drawDetailsSection = (doc, leftTitle, leftItems, rightTitle, rightItems) => {
  const pw = pageWidth(doc);
  const midX = pw / 2 + 10;

  const drawColumn = (title, items, x, underlineEnd) => {
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(title, x, 48);

    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.3);
    doc.line(x, 50, underlineEnd, 50);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9.5);
    items.forEach(({ label, value }, i) => {
      const y = 59 + i * 7;
      doc.setTextColor(...COLORS.muted);
      doc.text(`${label}:`, x, y);
      doc.setTextColor(...COLORS.primary);
      doc.text(String(value ?? '-'), x + 28, y);
    });
  };

  drawColumn(leftTitle, leftItems, 14, 60);
  drawColumn(rightTitle, rightItems, midX, midX + 50);
};

/**
 * Draws a summary box (e.g. "TOTAL PAID") aligned to the right.
 * @param {string}  label      - Small label text above the amount
 * @param {string}  amount     - Amount string (e.g. "INR 5,000")
 * @param {number}  y          - Top Y position of the box
 * @param {number[]} amtColor  - RGB color for the amount text
 */
const drawTotalBox = (doc, label, amount, y, amtColor = COLORS.primary) => {
  const pw = pageWidth(doc);
  const boxW = 88;
  const boxX = pw - 14 - boxW;

  doc.setFillColor(...COLORS.bg);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, y, boxW, 26, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLORS.muted);
  doc.text(label, boxX + boxW / 2, y + 10, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(...amtColor);
  doc.text(amount, boxX + boxW / 2, y + 20, { align: 'center' });
};

/** Draws a standard computer-generated footer at y=280. */
const drawFooter = (doc, text) => {
  doc.setFontSize(7.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.subtle);
  doc.text(text, centerX(doc, text), 280);
};

/** Shared autoTable config for receipt-style tables. */
const receiptTableConfig = (startY, body) => ({
  startY,
  head: [['Description', 'Status', 'Amount']],
  body,
  theme: 'grid',
  headStyles: {
    fillColor: COLORS.bg,
    textColor: COLORS.primary,
    fontStyle: 'bold',
    lineWidth: 0.1,
    fontSize: 9,
  },
  styles: {
    cellPadding: 6,
    lineColor: COLORS.border,
    lineWidth: 0.1,
    fontSize: 9,
  },
  columnStyles: {
    2: { halign: 'center', fontStyle: 'bold' },
  },
  didParseCell: (data) => {
    if (data.section === 'head' && data.column.index === 2) {
      data.cell.styles.halign = 'center';
    }
  },
});

/** Returns "INR X,XXX" formatted string. */
const inr = (amount) => `INR ${Number(amount ?? 0).toLocaleString('en-IN')}`;

// ─── PDF Generators ───────────────────────────────────────────────────────────

/**
 * Generates a class fee overview report.
 */
export const generateFeeReport = (classStudents, summary, classInfo, month, year) => {
  try {
    const doc = new jsPDF();
    const pw = pageWidth(doc);
    const monthLabel = MONTH_LABELS[month] ?? '';

    // Header
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pw, 4, 'F');

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Student Fee Report', 14, 20);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Class: ${formatValue(classInfo?.standard)}-${formatValue(classInfo?.section)}`, 14, 30);
    doc.text(`Period: ${monthLabel} ${year ?? ''}`, 14, 37);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 44);

    // Summary cards
    const cardY = 52;
    const cardH = 28;
    const cardW = (pw - 28 - 8) / 3;

    const cards = [
      { label: 'TOTAL STUDENTS', value: String(summary?.totalStudents ?? 0), color: COLORS.primary },
      { label: 'TOTAL COLLECTED', value: inr(summary?.totalCollected), color: COLORS.success },
      { label: 'TOTAL PENDING', value: inr(summary?.totalPending), color: COLORS.warning },
    ];

    cards.forEach(({ label, value, color }, i) => {
      const x = 14 + i * (cardW + 4);
      doc.setFillColor(...COLORS.bg);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setFontSize(7.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(label, x + 6, cardY + 9);

      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...color);
      doc.text(value, x + 6, cardY + 21);
    });

    // Table
    const tableData = (classStudents ?? []).flatMap((student) =>
      (student?.fees ?? []).map((fee, idx) => [
        idx === 0 ? (student.name ?? '') : '',
        fee.name ?? fee.feeType ?? '',
        inr(fee.amount),
        fee.status === 'WAIVED' ? '—' : inr(fee.paid),
        fee.status ?? '',
        fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '-',
      ])
    );

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: cardY + cardH + 8,
        head: [['Student', 'Fee Type', 'Amount', 'Paid', 'Status', 'Due Date']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.tableHead, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: { 4: { fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: COLORS.bg },
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.muted);
      doc.text('No records found for the selected filters.', 14, cardY + cardH + 16);
    }

    const std = classInfo?.standard ?? 'Class';
    const sec = classInfo?.section ?? '';
    doc.save(`Fee_Report_${std}_${sec}_${monthLabel}_${year ?? ''}.pdf`);
  } catch (error) {
    console.error('Failed to generate Fee Report:', error);
    alert('Could not generate the report. Please check the console for details.');
  }
};

/**
 * Generates a salary receipt for a teacher.
 */
export const generateSalaryReceipt = (salary, teacher) => {
  try {
    const doc = new jsPDF();
    const monthLabel = MONTH_LABELS[salary?.month] ?? '';

    drawReceiptHeader(doc, 'SALARY RECEIPT');

    drawDetailsSection(
      doc,
      'TEACHER DETAILS',
      [
        { label: 'Name',       value: formatValue(teacher?.name) },
        { label: 'Email',      value: formatValue(teacher?.email) },
        { label: 'Contact',    value: formatValue(teacher?.contactNo) },
      ],
      'PAYMENT DETAILS',
      [
        { label: 'Receipt No',    value: `PAY-${formatValue(salary?._id?.slice(-6).toUpperCase(), 'N/A')}` },
        { label: 'Month / Year',  value: `${monthLabel} ${formatValue(salary?.year, '')}` },
        { label: 'Payment Date',  value: salary?.paidDate ? new Date(salary.paidDate).toLocaleDateString('en-IN') : 'N/A' },
      ]
    );

    autoTable(doc, receiptTableConfig(90, [
      ['Monthly Net Salary', salary?.status ?? '', inr(salary?.amount)],
      ['Total Disbursed',    'PAID',                inr(salary?.amount)],
    ]));

    const boxY = (doc.lastAutoTable?.finalY ?? 120) + 14;
    drawTotalBox(doc, 'TOTAL PAID', inr(salary?.amount), boxY);
    drawFooter(doc, 'This is a computer generated receipt and does not require a physical signature.');

    const name = (teacher?.name ?? 'teacher').replace(/\s+/g, '_');
    doc.save(`Salary_Receipt_${monthLabel}_${salary?.year ?? ''}_${name}.pdf`);
  } catch (error) {
    console.error('Failed to generate Salary Receipt:', error);
    alert('Could not generate the receipt. Please check the console for details.');
  }
};

/**
 * Generates a fee payment receipt for a student.
 */
export const generateFeeReceipt = (fee, student) => {
  try {
    const doc = new jsPDF();
    const monthLabel = MONTH_LABELS[fee?.month] ?? '';
    const latestPayment = fee.payments?.[0] ?? {};
    const feeLabel = fee.name ?? fee.feeType ?? '';

    drawReceiptHeader(doc, 'FEE PAYMENT RECEIPT');

    drawDetailsSection(
      doc,
      'STUDENT DETAILS',
      [
        { label: 'Name',  value: student?.name },
        { label: 'Email', value: student?.email },
        { label: 'Class', value: `${fee.standard ?? '-'}-${fee.section ?? '-'}` },
      ],
      'PAYMENT DETAILS',
      [
        { label: 'Receipt No',    value: latestPayment.receiptNumber ?? 'N/A' },
        { label: 'Fee Type',      value: feeLabel },
        { label: 'Payment Date',  value: latestPayment.paymentDate ? new Date(latestPayment.paymentDate).toLocaleDateString('en-IN') : 'N/A' },
        { label: 'Payment Mode',  value: latestPayment.paymentMode },
      ]
    );

    const feeDesc = `${feeLabel} Fee${monthLabel ? ` (${monthLabel})` : ''}`;

    autoTable(doc, receiptTableConfig(100, [
      [feeDesc,      fee.status ?? 'PAID', inr(fee.amount)],
      ['Total Paid', 'SUCCESS',             inr(fee.paid)],
    ]));

    const boxY = (doc.lastAutoTable?.finalY ?? 130) + 14;
    drawTotalBox(doc, 'TOTAL PAID', inr(fee.paid), boxY, COLORS.success);
    drawFooter(doc, 'This is a computer generated receipt and does not require a physical signature.');

    const name = (student?.name ?? 'student').replace(/\s+/g, '_');
    doc.save(`Fee_Receipt_${monthLabel ? `${monthLabel}_` : ''}${name}.pdf`);
  } catch (error) {
    console.error('Failed to generate Fee Receipt:', error);
    alert('Could not generate the receipt. Please check the console for details.');
  }
};

/**
 * Generates an official fee waiver note for a student.
 */
export const generateWaiverNote = (fee, student) => {
  try {
    const doc = new jsPDF();
    const pw = pageWidth(doc);
    const monthLabel = MONTH_LABELS[fee?.month] ?? '';
    const feeLabel = fee.name ?? fee.feeType ?? '';

    drawReceiptHeader(doc, 'FEE WAIVER NOTE', COLORS.warning);

    drawDetailsSection(
      doc,
      'STUDENT DETAILS',
      [
        { label: 'Name',  value: student?.name },
        { label: 'Email', value: student?.email },
        { label: 'Class', value: `${fee.standard ?? '-'}-${fee.section ?? '-'}` },
      ],
      'WAIVER DETAILS',
      [
        { label: 'Ref No',      value: `WAV-${Math.random().toString(36).substring(2, 8).toUpperCase()}` },
        { label: 'Fee Type',    value: feeLabel },
        { label: 'Waiver Date', value: new Date().toLocaleDateString('en-IN') },
      ]
    );

    // Official statement box
    doc.setDrawColor(...COLORS.warning);
    doc.setFillColor(...COLORS.warningBg);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, 94, pw - 28, fee.remarks ? 44 : 36, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLORS.warningText);
    doc.text('OFFICIAL MANAGEMENT STATEMENT', 20, 104);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text('This certifies that the aforementioned fee has been officially waived by the', 20, 112);
    doc.text('school management. No further payment is required for this fee assignment.', 20, 119);

    if (fee.remarks) {
      doc.setFont(undefined, 'italic');
      doc.setTextColor(...COLORS.muted);
      doc.text(`Remarks: "${fee.remarks}"`, 20, 129);
    }

    const tableStartY = fee.remarks ? 145 : 137;
    const feeDesc = `${feeLabel} Fee${monthLabel ? ` (${monthLabel})` : ''}`;

    autoTable(doc, {
      ...receiptTableConfig(tableStartY, [
        [feeDesc,        'WAIVED', inr(fee.amount)],
        ['Net Payable',  'N/A',    'INR 0'],
      ]),
      head: [['Description', 'Status', 'Original Amount']],
    });

    drawFooter(doc, 'This is a computer generated waiver note and does not require a physical signature.');

    const name = (student?.name ?? 'student').replace(/\s+/g, '_');
    doc.save(`Fee_Waiver_${monthLabel}_${name}.pdf`);
  } catch (error) {
    console.error('Failed to generate Waiver Note:', error);
    alert('Could not generate the waiver note. Please check the console for details.');
  }
};

// ─── Timetable Generator ──────────────────────────────────────────────────────

/** Loads an image URL as a base64 data URL; resolves null on failure. */
const loadImageAsBase64 = (url) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 3000);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  });

/** Resolves teacher display name from a populated or raw teacherId field. */
const resolveTeacherName = (teacherId) => {
  if (!teacherId || typeof teacherId !== 'object' || !teacherId.name) return '';
  return teacherId.isArchived ? `${teacherId.name} (Archived)` : teacherId.name;
};

/**
 * Generates a class or personal timetable in landscape PDF.
 *
 * @param {object}        options
 * @param {Array}         options.entries       - TimetableEntry[] with populated timeSlotId & teacherId
 * @param {Array}         options.timeSlots     - TimeSlot[] sorted by slotNumber
 * @param {string}        options.standard      - e.g. "10" or "Teacher Name's Schedule"
 * @param {string}        options.section       - e.g. "A"
 * @param {string|number} options.academicYear
 * @param {string}        options.schoolName
 * @param {string|null}   options.schoolLogo    - URL for the school logo
 */
export const generateTimetable = async ({
  entries = [],
  timeSlots = [],
  standard = '',
  section = '',
  academicYear = '',
  schoolName = 'School',
  schoolLogo = null,
}) => {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const isPersonalSchedule = standard.includes('Schedule');

  // Build entry lookup: "Day__slotId" → entry
  const entryMap = new Map(
    entries.map((e) => [`${e.dayOfWeek}__${String(e.timeSlotId?._id ?? e.timeSlotId ?? '')}`, e])
  );

  const doc = new jsPDF({ orientation: 'landscape' });
  const pw = pageWidth(doc);

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, pw, 44, 'F');
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pw, 4, 'F');

  let headerTextX = 24;

  if (schoolLogo) {
    const base64Img = await loadImageAsBase64(schoolLogo);
    if (base64Img) {
      const { width: iw, height: ih } = doc.getImageProperties(base64Img);
      const ratio = iw / ih;
      const w = ratio > 1 ? 22 : 22 * ratio;
      const h = ratio < 1 ? 22 : 22 / ratio;
      doc.addImage(base64Img, 'PNG', 20, 10, w, h, undefined, 'FAST');
      headerTextX = 20 + w + 8;
    }
  }

  // School name
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(schoolName, headerTextX, 20);

  // Document type pill
  const docTypeLabel = isPersonalSchedule
    ? standard.replace(/'s Schedule|Schedule/gi, '').trim().toUpperCase() || 'FACULTY SCHEDULE'
    : 'CLASS TIMETABLE';

  const pillW = doc.getTextWidth(docTypeLabel) + 14;
  doc.setFillColor(...COLORS.border);
  doc.roundedRect(headerTextX, 24, pillW, 9, 4, 4, 'F');
  doc.setFontSize(9.5);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(docTypeLabel, headerTextX + 7, 30.5);

  // Subtitle
  const subtitleX = headerTextX + pillW + 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.secondary);

  const subtitle = isPersonalSchedule
    ? 'Faculty Schedule'
    : [`Class: ${standard}${section ? ` - ${section}` : ''}`, academicYear ? `Academic Year: ${academicYear}` : '']
        .filter(Boolean)
        .join('    •    ');

  doc.text(subtitle, subtitleX, 30.5);

  // Generated date
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    pw - 24, 20, { align: 'right' }
  );

  // ── Dynamic row sizing ──────────────────────────────────────────────────────
  const TABLE_START_Y = 40;
  const PAGE_H = doc.internal.pageSize.height;
  const BODY_FONT = 7.5;
  const LINE_H_MM = BODY_FONT * 0.353;
  const rowCount = timeSlots.length || 1;
  const availH = PAGE_H - TABLE_START_Y - 10 - 10; // footer reserve
  const targetRowH = availH / rowCount;
  const cellPadV = Math.min(4, Math.max(1.5, (targetRowH - 2 * LINE_H_MM) / 2));
  const cellPadH = 3;
  const PADDING = 1.2;

  // ── Build table data ────────────────────────────────────────────────────────
  const body = timeSlots.map((slot) => {
    const slotId = String(slot._id ?? slot.slotNumber ?? '');
    const timeLabel = `${formatTime(slot.startTime)}\n${formatTime(slot.endTime)}`;

    if (slot.slotType === 'BREAK') {
      return [
        {
          content: timeLabel,
          rawExt: { isTimeBreak: true },
          styles: { fontStyle: 'normal', fontSize: 8, textColor: COLORS.muted },
        },
        {
          content: slot.label ?? 'Break',
          colSpan: DAYS.length,
          rawExt: { isBreak: true },
          styles: { halign: 'center', valign: 'middle', fontStyle: 'italic', fontSize: 10, textColor: COLORS.subtle },
        },
      ];
    }

    const dayColumns = DAYS.map((day) => {
      const entry = entryMap.get(`${day}__${slotId}`);
      if (!entry) return { content: '', rawExt: { isEmpty: true } };

      const subject = entry.subject ?? 'No Subject';
      const secondary = isPersonalSchedule
        ? (entry.timetableId ? `${entry.timetableId.standard ?? ''}-${entry.timetableId.section ?? ''}` : '')
        : resolveTeacherName(entry.teacherId);

      return {
        content: secondary ? `${subject}\n${secondary}` : subject,
        rawExt: { subject, secondary, isEntry: true },
        styles: { textColor: COLORS.primary },
      };
    });

    return [
      {
        content: timeLabel,
        rawExt: { isTimePeriod: true },
        styles: { fontStyle: 'bold', fontSize: 8.5, textColor: COLORS.secondary },
      },
      ...dayColumns,
    ];
  });

  // ── autoTable ───────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: TABLE_START_Y,
    head: [['TIME', ...DAYS]],
    body,
    theme: 'plain',
    headStyles: {
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'center',
      cellPadding: { top: 7, bottom: 7, left: cellPadH, right: cellPadH },
      lineWidth: 0,
    },
    styles: {
      fontSize: BODY_FONT,
      cellPadding: { top: cellPadV + 2, bottom: cellPadV + 2, left: cellPadH, right: cellPadH },
      valign: 'middle',
      lineWidth: 0,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 28, valign: 'middle' },
    },
    margin: { left: 24, right: 24 },
    pageBreak: 'avoid',

    willDrawCell: ({ doc, cell, section }) => {
      if (section === 'head') {
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(cell.x + PADDING, cell.y + PADDING, cell.width - PADDING * 2, cell.height - PADDING * 2, 2, 2, 'F');
        cell.styles.fillColor = false;
        return;
      }

      const ext = cell.raw?.rawExt ?? {};
      cell.styles.fillColor = false;

      if (ext.isTimePeriod) {
        doc.setFillColor(...COLORS.bg);
      } else if (ext.isTimeBreak || ext.isBreak) {
        doc.setFillColor(241, 245, 249);
      } else if (ext.isEntry) {
        doc.setFillColor(...COLORS.white);
        doc.roundedRect(cell.x + PADDING, cell.y + PADDING, cell.width - PADDING * 2, cell.height - PADDING * 2, 3, 3, 'F');
        doc.setDrawColor(...COLORS.secondary);
        doc.setLineWidth(2);
        doc.line(cell.x + PADDING + 3, cell.y + PADDING + 4, cell.x + PADDING + 3, cell.y + cell.height - PADDING - 4);
        cell.text = []; // drawn manually in didDrawCell
        return;
      } else {
        doc.setFillColor(...COLORS.bg);
      }

      doc.roundedRect(cell.x + PADDING, cell.y + PADDING, cell.width - PADDING * 2, cell.height - PADDING * 2, 2, 2, 'F');
    },

    didDrawCell: ({ doc, cell, section }) => {
      if (section !== 'body' || !cell.raw?.rawExt?.isEntry) return;

      const { subject, secondary } = cell.raw.rawExt;
      const textX = cell.x + cellPadH + 6;
      const maxW = cell.width - cellPadH * 2 - 6;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(8.5);
      const subjectLines = doc.splitTextToSize(subject, maxW);
      const subjectH = subjectLines.length * 3.5;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      const secondaryLines = secondary ? doc.splitTextToSize(secondary, maxW) : [];
      const secondaryH = secondaryLines.length * 3;

      const totalH = subjectH + (secondaryLines.length ? secondaryH + 1.5 : 0);
      let y = cell.y + (cell.height - totalH) / 2 + 3;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.primary);
      doc.text(subjectLines, textX, y);

      if (secondaryLines.length) {
        y += subjectH + 0.5;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.muted);
        doc.text(secondaryLines, textX, y);
      }
    },
  });

  // ── Footer ──────────────────────────────────────────────────────────────────
  const footerY = (doc.lastAutoTable?.finalY ?? 150) + 8;
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.subtle);
  doc.text(`${schoolName} — Computer generated timetable`, pw / 2, footerY, { align: 'center' });

  const filename = section
    ? `timetable-${standard}-${section}.pdf`
    : `schedule-${standard}.pdf`;

  doc.save(filename);
};