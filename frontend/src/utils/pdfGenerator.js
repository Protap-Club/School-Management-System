import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatValue } from './index.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCHOOL_NAME = 'Navrachna International School';
const ACADEMIC_YEAR = 'Academic Year 2026';

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
        const navy = [30, 41, 59]; // slate-800
        const emerald = [5, 150, 105]; // emerald-600
        const amber = [245, 158, 11]; // amber-600

        // Decorative Header Bar
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('STUDENT FEE REPORT', 20, 27);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('NAVRACHNA INTERNATIONAL SCHOOL', pageWidth - 20, 20, { align: 'right' });
        const periodText = month ? `${MONTH_LABELS[month]} ${year} - ${year + 1}` : `${year} - ${year + 1}`;
        doc.text(`REPORT PERIOD: ${periodText}`, pageWidth - 20, 27, { align: 'right' });

        // Metadata
        doc.setFontSize(10);
        doc.setTextColor(...navy);
        doc.setFont(undefined, 'bold');
        doc.text(`CLASS: ${formatValue(classInfo?.standard)}-${formatValue(classInfo?.section)}`, 20, 50);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - 20, 50, { align: 'right' });

        // Summary Box
        doc.setDrawColor(...navy);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(20, 60, pageWidth - 40, 30, 2, 2, 'FD');
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('TOTAL STUDENTS', 35, 70);
        doc.text('TOTAL COLLECTED', pageWidth / 2, 70, { align: 'center' });
        doc.text('TOTAL PENDING', pageWidth - 35, 70, { align: 'right' });

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...navy);
        doc.text(`${summary?.totalStudents || 0}`, 35, 80);
        doc.setTextColor(...emerald);
        doc.text(`INR ${summary?.totalCollected?.toLocaleString() || 0}`, pageWidth / 2, 80, { align: 'center' });
        doc.setTextColor(...amber);
        doc.text(`INR ${summary?.totalPending?.toLocaleString() || 0}`, pageWidth - 35, 80, { align: 'right' });

        // Table
        const tableData = (classStudents || []).flatMap(student => 
            (student?.fees || []).map((fee, idx) => [
                idx === 0 ? student.rollNumber || '-' : '',
                idx === 0 ? student.name : '',
                fee.name || fee.feeType,
                `INR ${fee.amount?.toLocaleString() || 0}`,
                fee.status === 'WAIVED' ? '—' : `INR ${fee.paid?.toLocaleString() || 0}`,
                fee.status,
                fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'
            ])
        );

        if (tableData.length > 0) {
            autoTable(doc, {
                startY: 95,
                head: [['Roll No', 'Student', 'Fee Type', 'Amount', 'Paid', 'Status', 'Due Date']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 4 },
                columnStyles: {
                    4: { fontStyle: 'bold' }
                },
                alternateRowStyles: { fillColor: [250, 250, 250] }
            });
        } else {
            doc.text('No records found for the selected filters.', 14, 105);
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
 * Generates a PDF report for class penalties overview
 */
export const generatePenaltyReport = (penaltyStudents, summary, classInfo, month, year) => {
    console.log('Generating Penalty Report...', { penaltyStudents, summary, classInfo, month, year });
    
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const navy = [30, 41, 59]; // slate-800
        const emerald = [5, 150, 105]; // emerald-600
        const amber = [245, 158, 11]; // amber-600

        // Decorative Header Bar
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('CLASS PENALTY REPORT', 20, 27);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('NAVRACHNA INTERNATIONAL SCHOOL', pageWidth - 20, 20, { align: 'right' });
        // Handle case where month might be swapped with year or missing
        const displayYear = year || month; 
        doc.text(`REPORT PERIOD: ${displayYear} - ${displayYear + 1}`, pageWidth - 20, 27, { align: 'right' });

        // Metadata
        doc.setFontSize(10);
        doc.setTextColor(...navy);
        doc.setFont(undefined, 'bold');
        doc.text(`CLASS: ${formatValue(classInfo?.standard)}-${formatValue(classInfo?.section)}`, 20, 50);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - 20, 50, { align: 'right' });

        // Summary Box
        doc.setDrawColor(...navy);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(20, 60, pageWidth - 40, 30, 2, 2, 'FD');
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('TOTAL PENALTIES', 35, 70);
        doc.text('TOTAL COLLECTED', pageWidth / 2, 70, { align: 'center' });
        doc.text('TOTAL PENDING', pageWidth - 35, 70, { align: 'right' });

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...navy);
        doc.text(`${summary?.totalStudents || 0}`, 35, 80);
        doc.setTextColor(...emerald);
        doc.text(`INR ${summary?.totalCollected?.toLocaleString() || 0}`, pageWidth / 2, 80, { align: 'center' });
        doc.setTextColor(...amber);
        doc.text(`INR ${summary?.totalPending?.toLocaleString() || 0}`, pageWidth - 35, 80, { align: 'right' });

        // Table
        const tableData = (penaltyStudents || []).flatMap(student => 
            (student?.penalties || []).map((p, idx) => [
                idx === 0 ? student.rollNumber || '-' : '',
                idx === 0 ? student.name : '',
                p.reason || 'N/A',
                p.penaltyType || 'N/A',
                `INR ${p.amount?.toLocaleString() || 0}`,
                p.status === 'PAID' ? `INR ${(p.paidAmount || p.amount).toLocaleString()}` : '—',
                p.status,
                p.occurrenceDate ? new Date(p.occurrenceDate).toLocaleDateString() : '-'
            ])
        );

        if (tableData.length > 0) {
            autoTable(doc, {
                startY: 100,
                head: [['Roll No', 'Student', 'Reason', 'Type', 'Amount', 'Collected', 'Status', 'Date']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [...navy], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 8.5, cellPadding: 4 },
                columnStyles: { 5: { fontStyle: 'bold' } },
                alternateRowStyles: { fillColor: [249, 250, 251] }
            });
        } else {
            doc.text('No penalty records found for the selected period.', 20, 105);
        }

        doc.save(`Penalty_Report_${classInfo?.standard || 'Class'}_${classInfo?.section || ''}_${year || ''}.pdf`);
    } catch (error) {
        console.error('Failed to generate Penalty PDF Report:', error);
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
        const navy = [30, 41, 59]; // slate-800
        const emerald = [5, 150, 105]; // emerald-600

        // Decorative Header Bar
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('SALARY RECEIPT', 20, 27);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('NAVRACHNA INTERNATIONAL SCHOOL', pageWidth - 20, 20, { align: 'right' });
        doc.text(`RECEIPT: SAL-${salary?._id?.substring(salary._id.length - 6).toUpperCase()}`, pageWidth - 20, 27, { align: 'right' });

        // Content
        let y = 60;
        const drawSection = (title, items, x) => {
            doc.setFontSize(11);
            doc.setTextColor(...navy);
            doc.setFont(undefined, 'bold');
            doc.text(title, x, y);
            doc.setDrawColor(...navy);
            doc.line(x, y + 2, x + 40, y + 2);
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(70, 70, 70);
            items.forEach((item, i) => {
                doc.text(item, x, y + 12 + (i * 8));
            });
        };

        drawSection('TEACHER DETAILS', [
            `Name: ${formatValue(teacher?.name)}`,
            `Email: ${formatValue(teacher?.email)}`,
            `Contact: ${formatValue(teacher?.contactNo)}`
        ], 20);

        drawSection('PAYMENT DETAILS', [
            `Period: ${formatValue(MONTH_LABELS[salary?.month])} ${formatValue(salary?.year)}`,
            `Status: ${salary?.status || 'PAID'}`,
            `Date: ${salary?.paidDate ? new Date(salary.paidDate).toLocaleDateString() : 'N/A'}`
        ], pageWidth / 2 + 10);

        // Table
        autoTable(doc, {
            startY: 105,
            head: [['Description', 'Status', 'Amount']],
            body: [
                ['Monthly Net Salary', salary?.status || 'PAID', `INR ${salary?.amount?.toLocaleString() || 0}`],
                ['Total Disbursed', 'SUCCESS', `INR ${salary?.amount?.toLocaleString() || 0}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [...navy], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { cellPadding: 6, lineColor: [229, 231, 235] },
            columnStyles: { 2: { halign: 'center', fontStyle: 'bold' } }
        });

        // Total Box
        const finalY = (doc.lastAutoTable?.finalY || 135) + 15;
        doc.setFillColor(249, 250, 251);
        doc.setDrawColor(...navy);
        doc.roundedRect(pageWidth - 94, finalY, 80, 24, 2, 2, 'FD');
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...navy);
        doc.text('TOTAL PAID', pageWidth - 54, finalY + 9, { align: 'center' });
        doc.setTextColor(...emerald);
        doc.text(`INR ${salary?.amount?.toLocaleString() || 0}`, pageWidth - 54, finalY + 18, { align: 'center' });

        doc.save(`Salary_Receipt_${(teacher?.name || 'teacher').replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
        console.error('Failed to generate Salary Receipt PDF:', error);
    }
};

/**
 * Generates a fee payment receipt for a student.
 */
export const generateFeeReceipt = (fee, student) => {
    console.log('Generating Fee Receipt...', { fee, student });
    
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const latestPayment = fee.payments?.[0] || {};
        const navy = [30, 41, 59]; // slate-800
        const emerald = [5, 150, 105]; // emerald-600

        // Decorative Header Bar
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('FEE RECEIPT', 20, 27);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('NAVRACHNA INTERNATIONAL SCHOOL', pageWidth - 20, 20, { align: 'right' });
        doc.text(`RECEIPT: FEE-${latestPayment.receiptNumber || 'N/A'}`, pageWidth - 20, 27, { align: 'right' });

        // Content
        let y = 60;
        const drawSection = (title, items, x) => {
            doc.setFontSize(11);
            doc.setTextColor(...navy);
            doc.setFont(undefined, 'bold');
            doc.text(title, x, y);
            doc.setDrawColor(...navy);
            doc.line(x, y + 2, x + 40, y + 2);
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(70, 70, 70);
            items.forEach((item, i) => {
                doc.text(item, x, y + 12 + (i * 8));
            });
        };

        drawSection('STUDENT DETAILS', [
            `Name: ${student?.name || '-'}`,
            `Email: ${student?.email || '-'}`,
            `Class: ${fee.standard || '-'}-${fee.section || '-'}`
        ], 20);

        drawSection('PAYMENT DETAILS', [
            `Type: ${fee.name || fee.feeType || '-'}`,
            `Month: ${MONTH_LABELS[fee.month] || '-'} ${fee.year || ''}`,
            `Mode: ${latestPayment.paymentMode || 'Online'}`
        ], pageWidth / 2 + 10);

        // Table
        autoTable(doc, {
            startY: 105,
            head: [['Description', 'Status', 'Amount']],
            body: [
                [`${fee.name || fee.feeType} Fee (${MONTH_LABELS[fee.month] || ''})`, fee.status || 'PAID', `INR ${fee.amount?.toLocaleString() || 0}`],
                ['Total Collected', 'SUCCESS', `INR ${fee.paid?.toLocaleString() || 0}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [...navy], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { cellPadding: 6, lineColor: [229, 231, 235] },
            columnStyles: { 2: { halign: 'center', fontStyle: 'bold' } }
        });

        // Total Box
        const finalY = (doc.lastAutoTable?.finalY || 135) + 15;
        doc.setFillColor(249, 250, 251);
        doc.setDrawColor(...navy);
        doc.roundedRect(pageWidth - 94, finalY, 80, 24, 2, 2, 'FD');
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...navy);
        doc.text('TOTAL PAID', pageWidth - 54, finalY + 9, { align: 'center' });
        doc.setTextColor(...emerald);
        doc.text(`INR ${fee.paid?.toLocaleString() || 0}`, pageWidth - 54, finalY + 18, { align: 'center' });

        doc.save(`Fee_Receipt_${(student?.name || 'student').replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
        console.error('Failed to generate Fee Receipt PDF:', error);
    }
};

/**
 * Generates an official fee waiver note for a student.
 */
export const generateWaiverNote = (fee, student) => {
    console.log('Generating Waiver Note...', { fee, student });
    
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const navy = [30, 41, 59]; // slate-800
        const emerald = [5, 150, 105]; // emerald-600

        // Decorative Header Bar
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('WAIVER NOTE', 20, 27);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('NAVRACHNA INTERNATIONAL SCHOOL', pageWidth - 20, 20, { align: 'right' });
        doc.text(`REF: WAV-${Date.now().toString(36).toUpperCase()}`, pageWidth - 20, 27, { align: 'right' });

        // Content
        let y = 60;
        const drawSection = (title, items, x) => {
            doc.setFontSize(11);
            doc.setTextColor(...navy);
            doc.setFont(undefined, 'bold');
            doc.text(title, x, y);
            doc.setDrawColor(...navy);
            doc.line(x, y + 2, x + 40, y + 2);
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(70, 70, 70);
            items.forEach((item, i) => {
                doc.text(item, x, y + 12 + (i * 8));
            });
        };

        drawSection('STUDENT DETAILS', [
            `Name: ${student?.name || '-'}`,
            `Email: ${student?.email || '-'}`,
            `Class: ${fee.standard || '-'}-${fee.section || '-'}`
        ], 20);

        drawSection('FEE DETAILS', [
            `Type: ${fee.name || fee.feeType || '-'}`,
            `Month: ${MONTH_LABELS[fee.month] || '-'} ${fee.year || ''}`,
            `Status: OFFICIALLY WAIVED`
        ], pageWidth / 2 + 10);

        // Official Box
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(...emerald);
        doc.roundedRect(20, 110, pageWidth - 40, 35, 2, 2, 'FD');
        
        doc.setTextColor(...emerald);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('MANAGEMENT STATEMENT', pageWidth / 2, 122, { align: 'center' });
        
        doc.setFont(undefined, 'italic');
        doc.setFontSize(10);
        doc.text('This fee has been officially waived by the school management and no further payment is required.', pageWidth / 2, 132, { align: 'center' });

        // Signature Area
        doc.setTextColor(...navy);
        doc.setFont(undefined, 'normal');
        doc.text('AUTHORIZED SIGNATORY', pageWidth - 70, 180);
        doc.setDrawColor(200, 200, 200);
        doc.line(pageWidth - 70, 175, pageWidth - 20, 175);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('This is an official document providing proof of fee exemption for the academic record.', PAGE_CENTER(doc, 'This is an official document providing proof of fee exemption for the academic record.'), 285);

        doc.save(`Waiver_Note_${student?.name || 'student'}.pdf`);
    } catch (error) {
        console.error('Failed to generate Waiver Note PDF:', error);
    }
};

/**
 * Generates a PDF receipt for a student's penalty payment
 */
export const generatePenaltyReceipt = (p, student) => {
    console.log('Generating Penalty Receipt...', { p, student });
    
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const navy = [30, 41, 59]; // slate-800
        const emerald = [5, 150, 105]; // emerald-600

        // Decorative Header Bar (Navy)
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('PENALTY RECEIPT', 20, 27);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('NAVRACHNA INTERNATIONAL SCHOOL', pageWidth - 20, 20, { align: 'right' });
        doc.text(`RECEIPT: PN-${p?.penaltyId?.substring(p.penaltyId.length - 6).toUpperCase() || 'N/A'}`, pageWidth - 20, 27, { align: 'right' });

        // Content
        let y = 60;
        const drawSection = (title, items, x) => {
            doc.setFontSize(11);
            doc.setTextColor(...navy);
            doc.setFont(undefined, 'bold');
            doc.text(title, x, y);
            doc.setDrawColor(...navy);
            doc.line(x, y + 2, x + 40, y + 2);
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(70, 70, 70);
            items.forEach((item, i) => {
                doc.text(item, x, y + 12 + (i * 8));
            });
        };

        drawSection('STUDENT DETAILS', [
            `Name: ${student?.name || '-'}`,
            `Email: ${student?.email || '-'}`,
            `Class: ${p.standard || '-'}-${p.section || '-'}`
        ], 20);

        drawSection('PENALTY DETAILS', [
            `Type: ${p.penaltyType || '-'}`,
            `Reason: ${p.reason || '-'}`,
            `Date: ${p.occurrenceDate ? new Date(p.occurrenceDate).toLocaleDateString() : 'N/A'}`
        ], pageWidth / 2 + 10);

        // Table
        autoTable(doc, {
            startY: 105,
            head: [['Description', 'Status', 'Amount']],
            body: [
                [`Penalty for: ${p.reason}`, 'PAID', `INR ${p.amount?.toLocaleString() || 0}`],
                ['Total Collected', 'SUCCESS', `INR ${(p.paidAmount || p.amount).toLocaleString() || 0}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [...navy], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { cellPadding: 6, lineColor: [229, 231, 235] },
            columnStyles: { 2: { halign: 'center', fontStyle: 'bold' } }
        });

        // Total Box
        const finalY = (doc.lastAutoTable?.finalY || 135) + 15;
        doc.setFillColor(249, 250, 251);
        doc.setDrawColor(...navy);
        doc.roundedRect(pageWidth - 94, finalY, 80, 24, 2, 2, 'FD');
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...navy);
        doc.text('TOTAL PAID', pageWidth - 54, finalY + 9, { align: 'center' });
        doc.setTextColor(...emerald);
        doc.text(`INR ${(p.paidAmount || p.amount).toLocaleString() || 0}`, pageWidth - 54, finalY + 18, { align: 'center' });

        doc.save(`Penalty_Receipt_${student?.name || 'student'}.pdf`);
    } catch (error) {
        console.error('Failed to generate Penalty Receipt PDF:', error);
    }
};

/**
 * Generates a PDF waiver note for an excused penalty
 */
export const generatePenaltyWaiver = (p, student) => {
    console.log('Generating Penalty Waiver...', { p, student });
    
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const navy = [30, 41, 59]; // slate-800
        const emerald = [5, 150, 105]; // emerald-600

        // Decorative Header Bar
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('PENALTY WAIVER', 20, 27);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('NAVRACHNA INTERNATIONAL SCHOOL', pageWidth - 20, 20, { align: 'right' });
        doc.text(`REF: PWN-${Date.now().toString(36).toUpperCase()}`, pageWidth - 20, 27, { align: 'right' });

        // Content
        let y = 60;
        const drawSection = (title, items, x) => {
            doc.setFontSize(11);
            doc.setTextColor(...navy);
            doc.setFont(undefined, 'bold');
            doc.text(title, x, y);
            doc.setDrawColor(...navy);
            doc.line(x, y + 2, x + 45, y + 2);
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(70, 70, 70);
            items.forEach((item, i) => {
                doc.text(item, x, y + 12 + (i * 8));
            });
        };

        drawSection('STUDENT DETAILS', [
            `Name: ${student?.name || '-'}`,
            `Email: ${student?.email || '-'}`,
            `Class: ${p.standard || '-'}-${p.section || '-'}`
        ], 20);

        drawSection('PENALTY DETAILS', [
            `Type: ${p.penaltyType || '-'}`,
            `Original Reason: ${p.reason || '-'}`,
            `Original Amount: INR ${p.amount || 0}`
        ], pageWidth / 2 + 10);

        // Official Box
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(...emerald);
        doc.roundedRect(20, 110, pageWidth - 40, 35, 2, 2, 'FD');
        
        doc.setTextColor(...emerald);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('ADMINISTRATIVE WAIVER', pageWidth / 2, 122, { align: 'center' });
        
        doc.setFont(undefined, 'italic');
        doc.setFontSize(10);
        doc.text('This penalty has been reviewed and officially waived by the management.', pageWidth / 2, 132, { align: 'center' });

        // Signature Area
        doc.setTextColor(...navy);
        doc.setFont(undefined, 'normal');
        doc.text('AUTHORIZED SIGNATORY', pageWidth - 70, 180);
        doc.setDrawColor(200, 200, 200);
        doc.line(pageWidth - 70, 175, pageWidth - 20, 175);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('This document confirms that the student is no longer liable for the aforementioned penalty.', PAGE_CENTER(doc, 'This document confirms that the student is no longer liable for the aforementioned penalty.'), 285);

        doc.save(`Penalty_Waiver_${student?.name || 'student'}.pdf`);
    } catch (error) {
        console.error('Failed to generate Penalty Waiver PDF:', error);
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
  const TABLE_START_Y = 38;
  const PAGE_H = doc.internal.pageSize.height;
  const rowCount = timeSlots.length || 1;
  const totalRows = rowCount + 1; // Include the table header row

  // Even more refined height calculation for single page fit
  const footerReserve = 12;
  const headHeightEst = 8; // estimated head height in mm
  const availH = PAGE_H - TABLE_START_Y - headHeightEst - footerReserve;
  const targetRowH = Math.max(7, availH / totalRows);

  // Dynamic font scaling
  const BODY_FONT = totalRows > 12 ? 6.5 : (totalRows > 10 ? 7 : 7.5);
  const LINE_H_MM = BODY_FONT * 0.353;

  const cellPadV = Math.min(3, Math.max(0.5, (targetRowH - (2 * LINE_H_MM)) / 2));
  const cellPadH = 3;
  const PADDING = 1.2;

  // ── Build table data ────────────────────────────────────────────────────────
  const body = timeSlots.map((slot) => {
    const slotId = String(slot._id ?? slot.slotNumber ?? '');
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

// Backward-compatible alias used by timetable feature imports.
export const generateTimetablePDF = generateTimetable;
