import React from 'react';
import { STATUS_COLORS } from '../index';

const FeeStatusBadge = ({ status }) => {
    const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>{status}
        </span>
    );
};

export default FeeStatusBadge;
