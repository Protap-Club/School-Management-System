import React from 'react';
import {
    FaFilePdf, FaFileWord, FaFilePowerpoint, FaFileExcel, FaFileAlt, FaImage, FaFileVideo
} from 'react-icons/fa';
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, RECIPIENT_LABELS } from './noticeConstants';

export const FILE_ICON_MAP = [
    { match: ext => IMAGE_EXTENSIONS.includes(ext), icon: <FaImage className="text-purple-500" size={24} /> },
    { match: ext => VIDEO_EXTENSIONS.includes(ext), icon: <FaFileVideo className="text-rose-500" size={24} /> },
    { match: ext => ext === 'pdf', icon: <FaFilePdf className="text-red-500" size={24} /> },
    { match: ext => ['doc', 'docx'].includes(ext), icon: <FaFileWord className="text-blue-500" size={24} /> },
    { match: ext => ['ppt', 'pptx'].includes(ext), icon: <FaFilePowerpoint className="text-orange-500" size={24} /> },
    { match: ext => ['xls', 'xlsx', 'csv'].includes(ext), icon: <FaFileExcel className="text-green-600" size={24} /> },
    { match: ext => ['txt', 'iti'].includes(ext), icon: <FaFileAlt className="text-gray-500" size={24} /> },
];

export const getFileIcon = (filename, size = 24) => {
    if (!filename) return <FaFileAlt className="text-gray-400" size={size} />;
    const ext = filename.split('.').pop().toLowerCase();
    const mapObj = FILE_ICON_MAP.find(m => m.match(ext));
    if (mapObj && React.isValidElement(mapObj.icon)) {
        return React.cloneElement(mapObj.icon, { size: size });
    }
    return <FaFileAlt className="text-gray-400" size={size} />;
};

export const getRecipientLabel = (item) => {
    if (item.recipientType === 'classes') return item.recipients?.join(', ') || 'Classes';
    return RECIPIENT_LABELS[item.recipientType] || item.recipientType || 'Unknown';
};
