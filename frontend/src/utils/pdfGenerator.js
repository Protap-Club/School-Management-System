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
        doc.setFillColor(79, 70, 229); // primary color
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text('SALARY RECEIPT', 14, 25);

        // School Info
        doc.setFontSize(10);
        doc.text('Navrachna International School', pageWidth - 14, 20, { align: 'right' });
        doc.text('Academic Year 2026', pageWidth - 14, 27, { align: 'right' });

        // Details Section
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('TEACHER DETAILS', 14, 55);
        doc.line(14, 57, 60, 57);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Name: ${teacher?.name || '-'}`, 14, 65);
        doc.text(`Email: ${teacher?.email || '-'}`, 14, 72);
        doc.text(`Role: Teacher`, 14, 79);

        doc.setFont(undefined, 'bold');
        doc.text('PAYMENT DETAILS', pageWidth / 2 + 10, 55);
        doc.line(pageWidth / 2 + 10, 57, pageWidth / 2 + 60, 57);

        doc.setFont(undefined, 'normal');
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
                2: { halign: 'right', fontStyle: 'bold' }
            }
        });

        // Total Amount Box
        const finalY = (doc.lastAutoTable?.finalY || 120) + 10;
        doc.setFillColor(79, 70, 229);
        doc.roundedRect(pageWidth - 84, finalY, 70, 20, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('TOTAL PAID', pageWidth - 79, finalY + 7);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`INR ${salary?.amount?.toLocaleString() || 0}`, pageWidth - 79, finalY + 16);

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
