import * as XLSX from 'xlsx';

const MONTH_LABELS = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
    7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

/**
 * Generates an Excel spreadsheet report for class fees overview
 */
export const generateFeeExcel = (classStudents, summary, classInfo, month, year) => {
    console.log('Generating Fee Excel...', { classStudents, summary, classInfo, month, year });
    
    try {
        // Step 1: Format data for the worksheet
        // We want a flat structure, similar to the PDF table
        const excelData = classStudents.flatMap(student => 
            (student.fees || []).map(fee => ({
                'Student Name': student.name,
                'Fee Type': fee.name || fee.feeType,
                'Total Amount (INR)': fee.amount || 0,
                'Paid (INR)': fee.paid || 0,
                'Status': fee.status,
                'Due Date': fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'
            }))
        );

        if (excelData.length === 0) {
            alert('No records found for the selected filters to export.');
            return;
        }

        // Step 2: Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Step 3: Create workbook and append sheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Fee Report');

        // Step 4: Add some header information (optional, but good for context)
        // Adjust column widths for better readability
        const colWidths = [
            { wch: 25 }, // Student Name
            { wch: 20 }, // Fee Type
            { wch: 18 }, // Total Amount
            { wch: 15 }, // Paid
            { wch: 12 }, // Status
            { wch: 12 }  // Due Date
        ];
        worksheet['!cols'] = colWidths;

        // Step 5: Generate file name and download
        const className = `${classInfo?.standard || 'Class'}_${classInfo?.section || ''}`.trim();
        const monthName = MONTH_LABELS[month] || '';
        const fileName = `Fee_Report_${className}_${monthName}_${year || ''}.xlsx`;

        XLSX.writeFile(workbook, fileName);
        console.log('Fee Excel Report Generated Successfully');
    } catch (error) {
        console.error('Failed to generate Excel Report:', error);
        alert('Could not generate Excel file. Please check the console for errors.');
    }
};
