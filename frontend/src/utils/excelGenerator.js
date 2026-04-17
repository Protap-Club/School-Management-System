import ExcelJS from 'exceljs';

const MONTH_LABELS = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
    7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

/**
 * Generates an Excel spreadsheet report for class fees overview.
 * Uses ExcelJS (MIT, actively maintained) instead of the deprecated xlsx/SheetJS CE.
 */
export const generateFeeExcel = async (classStudents, summary, classInfo, month, year) => {
    try {
        const rows = classStudents.flatMap(student =>
            (student.fees || []).map(fee => ({
                name: student.name,
                feeType: fee.name || fee.feeType,
                amount: fee.amount || 0,
                paid: fee.status === 'WAIVED' ? '—' : (fee.paid || 0),
                status: fee.status,
                dueDate: fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'
            }))
        );

        if (rows.length === 0) {
            alert('No records found for the selected filters to export.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Fee Report');

        // Define columns with headers and widths
        sheet.columns = [
            { header: 'Student Name',      key: 'name',    width: 25 },
            { header: 'Fee Type',           key: 'feeType', width: 20 },
            { header: 'Total Amount (INR)', key: 'amount',  width: 18, style: { alignment: { horizontal: 'left' } } },
            { header: 'Paid (INR)',         key: 'paid',    width: 15, style: { alignment: { horizontal: 'left' } } },
            { header: 'Status',             key: 'status',  width: 12 },
            { header: 'Due Date',           key: 'dueDate', width: 12 },
        ];

        // Style the header row
        sheet.getRow(1).font = { bold: true };

        // Add data rows
        rows.forEach(row => sheet.addRow(row));

        // Generate buffer and trigger download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const className = `${classInfo?.standard || 'Class'}_${classInfo?.section || ''}`.trim();
        const monthName = MONTH_LABELS[month] || '';
        const fileName = `Fee_Report_${className}_${monthName}_${year || ''}.xlsx`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to generate Excel Report:', error);
        alert('Could not generate Excel file. Please check the console for errors.');
    }
};

/**
 * Generates an Excel spreadsheet report for class penalties overview.
 */
export const generatePenaltyExcel = async (penaltyStudents, summary, classInfo, year) => {
    try {
        const rows = penaltyStudents.flatMap(student =>
            (student.penalties || []).map(p => ({
                name: student.name,
                reason: p.reason || 'N/A',
                penaltyType: p.penaltyType || 'N/A',
                amount: p.amount || 0,
                collected: p.status === 'PAID' ? (p.paidAmount || p.amount) : '—',
                status: p.status,
                date: p.occurrenceDate ? new Date(p.occurrenceDate).toLocaleDateString() : '-'
            }))
        );

        if (rows.length === 0) {
            alert('No penalty records found for the selected period to export.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Penalty Report');

        // Define columns
        sheet.columns = [
            { header: 'Student Name',      key: 'name',        width: 25 },
            { header: 'Reason',             key: 'reason',      width: 30 },
            { header: 'Type',               key: 'penaltyType', width: 20 },
            { header: 'Amount (INR)',       key: 'amount',      width: 15, style: { alignment: { horizontal: 'left' } } },
            { header: 'Collected (INR)',    key: 'collected',   width: 15, style: { alignment: { horizontal: 'left' } } },
            { header: 'Status',             key: 'status',      width: 12 },
            { header: 'Date',               key: 'date',        width: 12 },
        ];

        sheet.getRow(1).font = { bold: true };
        rows.forEach(row => sheet.addRow(row));

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const className = `${classInfo?.standard || 'Class'}_${classInfo?.section || ''}`.trim();
        const fileName = `Penalty_Report_${className}_${year || ''}.xlsx`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to generate Penalty Excel Report:', error);
        alert('Could not generate Excel file. Please check the console for errors.');
    }
};
