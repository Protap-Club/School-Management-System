import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTH_LABELS = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
    7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

/**
 * Generates a PDF report for class fees overview
 */
export const generateFeeReport = (classStudents, summary, classInfo, month, year) => {
    console.log('Generating Fee Report...', { classStudents, summary, classInfo, month, year });
    
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('Student Fee Report', PAGE_CENTER(doc, 'Student Fee Report'), 20);

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Class: ${classInfo?.standard || '-'}-${classInfo?.section || '-'}`, 14, 30);
        doc.text(`Date: ${MONTH_LABELS[month] || ''} ${year || ''}`, 14, 37);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 44);

        // Summary Box
        doc.setDrawColor(230, 230, 230);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(14, 55, pageWidth - 28, 30, 3, 3, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text('TOTAL STUDENTS', 25, 65);
        doc.text('TOTAL COLLECTED', pageWidth / 2 - 15, 65);
        doc.text('TOTAL PENDING', pageWidth - 65, 65);

        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text(`${summary?.totalStudents || 0}`, 25, 75);
        doc.setTextColor(16, 185, 129); // emerald-600
        doc.text(`INR ${summary?.totalCollected?.toLocaleString() || 0}`, pageWidth / 2 - 15, 75);
        doc.setTextColor(245, 158, 11); // amber-600
        doc.text(`INR ${summary?.totalPending?.toLocaleString() || 0}`, pageWidth - 65, 75);

        // Table
        const tableData = (classStudents || []).flatMap(student => 
            (student?.fees || []).map((fee, idx) => [
                idx === 0 ? student.name : '',
                fee.name || fee.feeType,
                `INR ${fee.amount?.toLocaleString() || 0}`,
                `INR ${fee.paid?.toLocaleString() || 0}`,
                fee.status,
                fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'
            ])
        );

        if (tableData.length > 0) {
            autoTable(doc, {
                startY: 95,
                head: [['Student', 'Fee Type', 'Amount', 'Paid', 'Status', 'Due Date']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 4 },
                columnStyles: {
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { fontStyle: 'bold' }
                },
                alternateRowStyles: { fillColor: [250, 250, 250] }
            });
        } else {
            doc.text('No records found for the selected filters.', 14, 105);
        }

        doc.save(`Fee_Report_${classInfo?.standard || 'Class'}_${classInfo?.section || ''}_${MONTH_LABELS[month] || ''}_${year || ''}.pdf`);
        console.log('Fee Report Generated Successfully');
    } catch (error) {
        console.error('Failed to generate PDF Report:', error);
        alert('Could not generate PDF. Please check the console for errors.');
    }
};

/**
 * Generates a PDF receipt for a teacher's salary payment
 */
export const generateSalaryReceipt = (salary, teacher) => {
    console.log('Generating Salary Receipt...', { salary, teacher });
    
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Design Elements
        // Removed filled rect background for print friendliness
        doc.setFontSize(16); // Reduced from 18
        doc.setTextColor(40, 40, 40); // Black text for title
        doc.text('SALARY RECEIPT', 14, 25);

        // School Info
        doc.setFontSize(16); // Increased from 14
        doc.setTextColor(40, 40, 40); // Black text
        doc.setFont(undefined, 'bold');
        doc.text('Navrachna International School', pageWidth - 14, 22, { align: 'right' }); // Adjusted y
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100); // Dark Gray
        doc.text('Academic Year 2026', pageWidth - 14, 29, { align: 'right' }); // Adjusted y

        // Subtle Header Divider
        doc.setDrawColor(220, 220, 220); // Light/Medium gray
        doc.setLineWidth(0.5);
        doc.line(14, 38, pageWidth - 14, 38);

        // Details Section
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('TEACHER DETAILS', 14, 55);
        doc.line(14, 57, 60, 57);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Name: ${teacher?.name || '-'}`, 14, 65);
        doc.text(`Email: ${teacher?.email || '-'}`, 14, 72);
        doc.text(`Contact No: ${teacher?.contactNo || '-'}`, 14, 79);

        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.text('PAYMENT DETAILS', pageWidth / 2 + 10, 55);
        doc.line(pageWidth / 2 + 10, 57, pageWidth / 2 + 60, 57);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Receipt No: PAY-${salary?._id?.substring(salary._id.length - 6).toUpperCase() || 'N/A'}`, pageWidth / 2 + 10, 65);
        doc.text(`Month/Year: ${MONTH_LABELS[salary?.month] || ''} ${salary?.year || ''}`, pageWidth / 2 + 10, 72);
        doc.text(`Payment Date: ${salary?.paidDate ? new Date(salary.paidDate).toLocaleDateString() : 'N/A'}`, pageWidth / 2 + 10, 79);

        // Summary Table
        autoTable(doc, {
            startY: 95,
            head: [['Description', 'Status', 'Amount']],
            body: [
                ['Monthly Net Salary', salary?.status || '', `INR ${salary?.amount?.toLocaleString() || 0}`],
                ['Total Disbursed', 'PAID', `INR ${salary?.amount?.toLocaleString() || 0}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [243, 244, 246], textColor: [40, 40, 40], fontStyle: 'bold', lineWidth: 0.1 },
            styles: { cellPadding: 6, lineColor: [229, 231, 235], lineWidth: 0.1 },
            columnStyles: {
                2: { halign: 'center', fontStyle: 'bold' } // Center aligned
            },
            didParseCell: function(data) {
                // Ensure the Amount heading is also centered
                if (data.section === 'head' && data.column.index === 2) {
                    data.cell.styles.halign = 'center';
                }
            }
        });

        // Total Amount Box
        const finalY = (doc.lastAutoTable?.finalY || 120) + 15; // Increased spacing
        const boxWidth = 80;
        const boxX = pageWidth - 14 - boxWidth; // Aligned with right margin of table
        
        doc.setFillColor(249, 250, 251); // gray-50
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.roundedRect(boxX, finalY, boxWidth, 24, 2, 2, 'FD'); // Fill and stroke
        
        doc.setTextColor(100, 100, 100); // gray text for label
        doc.setFontSize(9); // Size for TOTAL PAID
        doc.setFont(undefined, 'bold');
        // Center text horizontally in the box
        doc.text('TOTAL PAID', boxX + (boxWidth / 2), finalY + 9, { align: 'center' });
        
        doc.setTextColor(40, 40, 40); // black text for amount
        doc.setFontSize(14); // Size for Amount
        doc.setFont(undefined, 'bold');
        doc.text(`INR ${salary?.amount?.toLocaleString() || 0}`, boxX + (boxWidth / 2), finalY + 18, { align: 'center' });

        // Footer
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('This is a computer generated receipt and does not require a physical signature.', PAGE_CENTER(doc, 'This is a computer generated receipt and does not require a physical signature.'), 280);

        doc.save(`Salary_Receipt_${MONTH_LABELS[salary?.month] || ''}_${salary?.year || ''}_${(teacher?.name || 'teacher').replace(/\s+/g, '_')}.pdf`);
        console.log('Salary Receipt Generated Successfully');
    } catch (error) {
        console.error('Failed to generate Salary Receipt PDF:', error);
        alert('Could not generate receipt PDF. Please check the console for details.');
    }
};

const PAGE_CENTER = (doc, text) => {
    try {
        const pageWidth = doc.internal.pageSize.width;
        const textWidth = doc.getTextWidth(text);
        return (pageWidth - textWidth) / 2;
    } catch {
        return 14;
    }
};

/**
 * Generates a PDF timetable for a class or personal schedule.
 *
 * @param {Object}       options
 * @param {Array}        options.entries       - TimetableEntry[] with populated timeSlotId & teacherId
 * @param {Array}        options.timeSlots     - TimeSlot[] sorted by slotNumber
 * @param {string}       options.standard      - e.g. "10"
 * @param {string}       options.section       - e.g. "A"
 * @param {string|number} options.academicYear - e.g. 2025
 * @param {string}       options.schoolName    - Display name of the school
 */
const getBase64ImageFromUrl = async (imageUrl) => {
    return new Promise((resolve) => {
        let isResolved = false;
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        // Fast resolution timeout (3 seconds) to prevent frozen PDFs
        const timer = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                resolve(null);
            }
        }, 3000);

        img.onload = () => {
            if (isResolved) return;
            clearTimeout(timer);
            isResolved = true;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => {
            if (!isResolved) {
                clearTimeout(timer);
                isResolved = true;
                resolve(null);
            }
        };
        img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    });
};

export const generateTimetablePDF = async ({
    entries = [],
    timeSlots = [],
    standard = '',
    section = '',
    academicYear = '',
    schoolName = 'School',
    schoolLogo = null,
}) => {
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Convert 24-h "HH:MM" to "HH:MM AM/PM"; passthrough if already contains am/pm
    const formatTime = (t) => {
        if (!t) return '';
        if (/am|pm/i.test(t)) return t;
        const [h, m] = t.split(':').map(Number);
        if (isNaN(h)) return t;
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')} ${period}`;
    };

    // Resolve teacher display name from a populated or raw teacherId field
    const getTeacherName = (teacherId) => {
        if (!teacherId) return '';
        if (typeof teacherId === 'object' && teacherId?.name) {
            return teacherId.isArchived
                ? `${teacherId.name} (Archived)`
                : teacherId.name;
        }
        return '';
    };

    // Build lookup table: "Mon__<slotId>" → entry
    const entryMap = new Map();
    entries.forEach((e) => {
        const slotId = String(e.timeSlotId?._id || e.timeSlotId || '');
        entryMap.set(`${e.dayOfWeek}__${slotId}`, e);
    });

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.width;

    // ── Header ──────────────────────────────────────────────────────────────
    let headerStartX = 14;

    if (schoolLogo) {
        try {
            const base64Img = await getBase64ImageFromUrl(schoolLogo);
            if (base64Img) {
                // Calculate dimensions to maintain aspect ratio (max 22x22)
                const imgProps = doc.getImageProperties(base64Img);
                const ratio = imgProps.width / imgProps.height;
                const finalW = ratio > 1 ? 22 : 22 * ratio;
                const finalH = ratio < 1 ? 22 : 22 / ratio;
                doc.addImage(base64Img, 'PNG', 14, 10, finalW, finalH, undefined, 'FAST');
                headerStartX = 14 + finalW + 6;
            }
        } catch (e) {
            console.warn('Could not load logo for PDF', e);
        }
    }

    // Main School Title
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(31, 41, 55); // Tailwind gray-800
    doc.text(schoolName, headerStartX, 18);

    // Document Type Label
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(59, 130, 246); // Tailwind blue-500
    doc.text('WEEKLY TIMETABLE', headerStartX, 25);

    // Subtitle Details
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(107, 114, 128); // Tailwind gray-500
    const subtitle = section
        ? `Class ${standard}-${section}  •  Academic Year: ${academicYear || '—'}`
        : `${standard}  •  Academic Year: ${academicYear || '—'}`;
    doc.text(`   |   ${subtitle}`, headerStartX + 36, 25);

    // Generated Date (Top Right Corner)
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // Tailwind gray-400
    doc.text(
        `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        pageWidth - 14, 18, { align: 'right' }
    );

    // Thick minimal divider
    doc.setDrawColor(229, 231, 235); // Tailwind gray-200
    doc.setLineWidth(0.5);
    doc.line(14, 33, pageWidth - 14, 33);

    // ── Dynamic sizing — keep everything on one landscape A4 page ────────────
    // Landscape A4 height = 210mm; startY at 38 leaves ~162mm for table
    const TABLE_START_Y = 38;
    const PAGE_HEIGHT = doc.internal.pageSize.height;
    const FOOTER_RESERVE = 10;
    const TABLE_HEADER_H = 10;
    const rowCount = timeSlots.length || 1;
    const availableForRows = PAGE_HEIGHT - TABLE_START_Y - FOOTER_RESERVE - TABLE_HEADER_H;
    const targetRowH = availableForRows / rowCount;
    const BODY_FONT = 7.5;
    const LINE_H_MM = BODY_FONT * 0.353;
    const MAX_LINES = 2;
    const cellPadV = Math.min(4, Math.max(1.5, (targetRowH - MAX_LINES * LINE_H_MM) / 2));
    const cellPadH = 3;

    // ── Table ────────────────────────────────────────────────────────────────
    const head = [['TIME', ...DAYS]];
    const body = [];

    timeSlots.forEach((slot) => {
        const slotId = String(slot._id || slot.slotNumber || '');
        const timeLabel = `${formatTime(slot.startTime)}\n${formatTime(slot.endTime)}`;

        if (slot.slotType === 'BREAK') {
            // Break row: time column + one merged cell spanning all 6 days
            body.push([
                {
                    content: timeLabel,
                    styles: {
                        fontStyle: 'normal',
                        fontSize: 7.5,
                        textColor: [130, 130, 130],
                        fillColor: [250, 250, 250],
                    },
                },
                {
                    content: slot.label || 'Break',
                    colSpan: DAYS.length,
                    styles: {
                        halign: 'center',
                        fontStyle: 'italic',
                        textColor: [150, 150, 150],
                        fillColor: [250, 250, 250],
                    },
                },
            ]);
            return;
        }

        // Regular period row
        const row = [
            {
                content: timeLabel,
                styles: {
                    fontStyle: 'bold',
                    fontSize: 8,
                    textColor: [60, 60, 60],
                },
            },
        ];

        DAYS.forEach((day) => {
            const entry = entryMap.get(`${day}__${slotId}`);
            if (entry) {
                const teacher = getTeacherName(entry.teacherId);
                const classLabel = entry.timetableId ? `${entry.timetableId.standard || ''}-${entry.timetableId.section || ''}` : '';
                const isPersonalSchedule = standard === 'My Schedule';
                // Always prioritize raw standard if provided directly, otherwise Fallback to teacher.
                const secondaryText = isPersonalSchedule ? classLabel : teacher;
                const subject = entry.subject || 'No Subject';

                row.push({
                    content: secondaryText ? `${subject}\n${secondaryText}` : subject,
                    rawExt: { subject, secondaryText },
                    styles: {
                        textColor: [31, 41, 55],       // text-gray-800
                        fillColor: [255, 255, 255],    // bg-white
                        lineColor: [229, 231, 235],    // border-gray-200
                        lineWidth: 0.1,                // Thin underlying cell grid
                    },
                });
            } else {
                row.push({
                    content: '',
                    styles: { 
                        fillColor: [250, 250, 250],    // bg-gray-50
                    },
                });
            }
        });

        body.push(row);
    });

    autoTable(doc, {
        startY: TABLE_START_Y,
        head,
        body,
        theme: 'plain', // Use plain to support cell-hook overriding efficiently
        headStyles: {
            fillColor: [31, 41, 55],    // dark gray block for header (gray-800)
            textColor: [255, 255, 255], // white text
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'center',
            cellPadding: { top: 5, bottom: 5, left: cellPadH, right: cellPadH }, // Slightly taller
            lineColor: [31, 41, 55],    // Matching border color for header
            lineWidth: { bottom: 0 },
        },
        styles: {
            fontSize: BODY_FONT,
            cellPadding: { top: cellPadV, bottom: cellPadV, left: cellPadH, right: cellPadH },
            valign: 'top',
            lineColor: [243, 244, 246], // border-gray-100 inner grid lines
            lineWidth: 0.2,
            overflow: 'linebreak',
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 26, fillColor: [249, 250, 251], valign: 'middle' },
        },
        margin: { left: 14, right: 14 },
        pageBreak: 'avoid',
        willDrawCell: (hookData) => {
            // Null out text if this is a mapped entry so autoTable doesn't draw plain bold text
            if (hookData.section === 'body' && hookData.column.index > 0 && hookData.cell.raw && hookData.cell.raw.rawExt) {
                hookData.cell.text = [];
            }
        },
        didDrawCell: (hookData) => {
            const doc = hookData.doc;
            const cell = hookData.cell;

            if (hookData.section === 'body' && hookData.column.index > 0 && cell.raw && cell.raw.rawExt) {
                const { subject, secondaryText } = cell.raw.rawExt;
                
                // Draw Web-style vertical left border on the entry card
                // Using Tailwind slate shadow/border equivalent
                doc.setDrawColor(31, 41, 55); // border-gray-800
                doc.setLineWidth(1.2);
                doc.line(cell.x + 0.6, cell.y + 0.5, cell.x + 0.6, cell.y + cell.height - 0.5);

                const textX = cell.x + cellPadH + 2;
                const textY = cell.y + cellPadV + 3; // Top-align baseline

                // Subject Name in bold
                doc.setFont(undefined, 'bold');
                doc.setFontSize(8);
                doc.setTextColor(17, 24, 39); // text-gray-900
                doc.text(subject, textX, textY, { maxWidth: cell.width - cellPadH * 2 - 2 });

                // Subtitle (Teacher / Class) in normal text
                if (secondaryText) {
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(75, 85, 99); // text-gray-600
                    doc.text(secondaryText, textX, textY + 4, { maxWidth: cell.width - cellPadH * 2 - 2 });
                }
            }
        }
    });

    // ── Footer ───────────────────────────────────────────────────────────────
    const finalY = (doc.lastAutoTable?.finalY || 150) + 6;
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(
        `${schoolName} — Computer generated timetable`,
        pageWidth / 2,
        finalY,
        { align: 'center' }
    );

    const filename = section
        ? `timetable-${standard}-${section}.pdf`
        : `schedule-${standard}.pdf`;
    doc.save(filename);
};
