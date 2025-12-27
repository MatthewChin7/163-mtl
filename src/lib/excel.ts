import * as XLSX from 'xlsx';
import { Indent } from '@/types';
import { format } from 'date-fns';

export const exportIndentsToExcel = (indents: Indent[]) => {
    // 1. Master Sheet Data Preparation
    const masterData = indents.map(indent => ({
        'Serial No': indent.serialNumber,
        'Status': indent.status,
        'Vehicle Type': indent.vehicleType,
        'Vehicle No': indent.vehicleNumber || '-',
        'Start Time': format(new Date(indent.startTime), 'yyyy-MM-dd HH:mm'),
        'End Time': format(new Date(indent.endTime), 'yyyy-MM-dd HH:mm'),
        'Start Location': indent.startLocation,
        'End Location': indent.endLocation,
        'Purpose': indent.purpose,
        'Indent Type': indent.typeOfIndent,
        'VComd': indent.vehicleCommanderName,
        'Requestor ID': indent.requestorId,
        'Reason': indent.reason,
        'Remarks': indent.specialInstructions || '-',
        'Cancellation Reason': indent.cancellationReason || '-'
    }));

    // 2. Daily Detail Sheet (Mocking logic: just same data formatted differently or filtered)
    const today = new Date().toISOString().split('T')[0];
    const dailyData = indents
        .filter(i => i.startTime.startsWith(today))
        .map(indent => ({
            'Time': format(new Date(indent.startTime), 'HH:mm'),
            'Vehicle': indent.vehicleType,
            'Route': `${indent.startLocation} to ${indent.endLocation}`,
            'Purpose': indent.purpose,
            'Commander': indent.vehicleCommanderName
        }));

    // Create Workbook
    const workbook = XLSX.utils.book_new();

    // Add Master Sheet
    const masterSheet = XLSX.utils.json_to_sheet(masterData);
    XLSX.utils.book_append_sheet(workbook, masterSheet, "Master Indent List");

    // Add Daily Sheet (if any data)
    if (dailyData.length > 0) {
        const dailySheet = XLSX.utils.json_to_sheet(dailyData);
        XLSX.utils.book_append_sheet(workbook, dailySheet, `Daily Detail (${today})`);
    } else {
        // Add empty sheet explanation
        const emptySheet = XLSX.utils.json_to_sheet([{ 'Info': 'No movements for today' }]);
        XLSX.utils.book_append_sheet(workbook, emptySheet, `Daily Detail`);
    }

    // Generate File
    XLSX.writeFile(workbook, `163MTL_Indents_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
};
