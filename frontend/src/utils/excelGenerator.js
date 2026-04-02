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
                paid: fee.paid || 0,
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
            { header: 'Total Amount (INR)', key: 'amount',  width: 18 },
            { header: 'Paid (INR)',         key: 'paid',    width: 15 },
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
