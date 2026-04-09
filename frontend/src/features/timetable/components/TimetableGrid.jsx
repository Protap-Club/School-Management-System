import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { DAYS_OF_WEEK } from '..';

const TimetableGrid = ({
  entries = [],
  timeSlots = [],
  teachers = [],
  weekDates = {},
  formatDateShort,
  onCellClick,
  onMarkUnavailable,
  readOnly = false,
  showClass = false,
  isTeacherView = false
}) => {
  const getSlotId = (slot) => slot._id || slot.slotNumber;

  const getEntry = (dayOfWeek, slot) => {
    const slotId = getSlotId(slot);
    return entries.find(
      (entry) => {
        const entryDay = entry.dayOfWeek || entry.day; // Handle both property names
        const entrySlotId = entry.timeSlotId?._id || entry.timeSlotId || entry.timeSlot?._id;
        return entryDay === dayOfWeek && entrySlotId === slotId;
      }
    );
  };

  const getTeacherName = (teacherId) => {
    if (!teacherId) return 'No Assigned Teacher';
    // If teacherId has embedded name (from populated response), check archive status
    if (teacherId?.name) {
      return teacherId.isArchived ? `${teacherId.name} (Archived)` : teacherId.name;
    }
    // Fallback: lookup in teachers array
    const id = teacherId?._id || teacherId;
    const teacher = teachers.find((t) => t._id === id);
    if (!teacher) return 'No Assigned Teacher';
    return teacher.isArchived ? `${teacher.name} (Archived)` : teacher.name;
  };
  const getClassDisplay = (entry) => {
    if (entry.timetableId) {
      const tt = entry.timetableId;
      return `${tt.standard}${tt.section}`;
    }
    return '';
  };
  const formatTime = (time) => {
    if (!time) return '';
    // If it already has AM/PM, just return it (or normalize if needed)
    if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) {
      return time;
    }
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return time;

    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getCellState = (entry) => {
    if (!entry) return 'empty';
    if (entry.isProxy) return 'proxy_duty';
    if (entry.proxyRequestStatus === 'pending') return 'proxy_pending';
    if (entry.proxyRequestStatus === 'proxy_assigned') return 'proxy_assigned';
    if (entry.proxyRequestStatus === 'free_period' || entry.isFreePeriod || entry.proxyType === 'free_period') {
      return 'free_period';
    }
    return 'regular';
  };

  const getCellClasses = (state) => {
    switch (state) {
      case 'proxy_duty':
        return 'bg-emerald-50 border-l-[3px] border-l-emerald-500 hover:bg-emerald-100 cursor-pointer shadow-sm';
      case 'proxy_pending':
        return 'bg-amber-50 border-l-[3px] border-l-amber-500 hover:bg-amber-100 cursor-pointer shadow-sm';
      case 'proxy_assigned':
        return 'bg-blue-50 border-l-[3px] border-l-blue-500 hover:bg-blue-100 cursor-pointer shadow-sm';
      case 'free_period':
        return 'bg-gray-100 border-l-[3px] border-l-gray-500 hover:bg-gray-200 cursor-pointer shadow-sm';
      default:
        return 'bg-white border-l-[3px] border-l-gray-800 hover:bg-gray-50 cursor-pointer shadow-sm';
    }
  };

  const getTextColor = (state) => {
    if (state === 'proxy_duty') return 'text-emerald-700';
    if (state === 'proxy_pending') return 'text-amber-700';
    if (state === 'proxy_assigned') return 'text-blue-700';
    if (state === 'free_period') return 'text-gray-500';
    return 'text-gray-600';
  };

  return (
    <div className="w-full">
      <div className="w-full border border-gray-300 shadow-sm rounded-xl overflow-hidden bg-white">
        {/* Header Row */}
        <div className="grid grid-cols-[100px_repeat(6,1fr)] bg-gray-100 border-b border-gray-300">
          <div className="py-2.5 px-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider text-center border-r border-gray-300 flex items-center justify-center">
            Time
          </div>
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="py-2.5 px-3 text-center border-r border-gray-300 last:border-r-0"
            >
              <div className="text-[12px] font-bold text-gray-800">{day}</div>
              {weekDates[day] && formatDateShort && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {formatDateShort(weekDates[day])}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Time Slot Rows */}
        {timeSlots.map((slot) => {
          const isBreak = slot.slotType === 'BREAK';
          const slotId = getSlotId(slot);

          return (
            <div
              key={slotId}
              className={`grid border-b border-gray-200/60 last:border-b-0 ${isBreak
                ? 'grid-cols-[100px_1fr] bg-white'
                : 'grid-cols-[100px_repeat(6,1fr)]'
                }`}
            >
              {/* Time Column */}
              <div className={`py-4 px-2 flex flex-col items-center justify-center border-r border-gray-200/80 text-center bg-white`}>
                <span className="text-[12px] font-medium text-gray-800">
                  {formatTime(slot.startTime)}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">
                  {formatTime(slot.endTime)}
                </span>
              </div>

              {isBreak ? (
                <div className="py-4 flex items-center justify-center">
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em]">
                    {slot.label || 'Break'}
                  </span>
                </div>
              ) : (
                DAYS_OF_WEEK.map((day) => {
                  const entry = getEntry(day, slot);
                  const cellState = getCellState(entry);

                  return (
                    <div
                      key={`${day}-${slotId}`}
                      onClick={() => {
                        // If teacher view and has entry, trigger mark unavailable (always allowed for teachers)
                        if (isTeacherView && entry && onMarkUnavailable) {
                          if (entry.isProxy) return;
                          onMarkUnavailable(day, slot, entry);
                          return;
                        }
                        // For other cases, respect readOnly
                        if (readOnly) return;
                        if (onCellClick) {
                          onCellClick(day, slot, entry);
                        }
                      }}
                      className={`min-h-[85px] p-3 border-r border-gray-200/60 last:border-r-0 transition-colors relative group flex flex-col justify-start ${
                        entry
                          ? getCellClasses(cellState)
                          : !readOnly ? 'cursor-pointer hover:bg-gray-50/30' : ''
                      }`}
                    >
                      {entry ? (
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-[13px] font-semibold text-gray-900 leading-tight line-clamp-2">
                                {entry.subject || 'No Subject'}
                              </h4>
                              {entry.isProxy && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-200 rounded">
                                  PROXY DUTY
                                </span>
                              )}
                              {entry.proxyRequestStatus === 'pending' && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-200 rounded">
                                  REQUESTED
                                </span>
                              )}
                              {entry.proxyRequestStatus === 'proxy_assigned' && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 bg-blue-200 rounded">
                                  PROXY ASSIGNED
                                </span>
                              )}
                              {(entry.proxyRequestStatus === 'free_period' || entry.isFreePeriod || entry.proxyType === 'free_period') && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold text-gray-700 bg-gray-300 rounded">
                                  FREE PERIOD
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-0.5">
                              {showClass ? (
                                <span className={`text-[12px] font-medium ${getTextColor(cellState)}`}>
                                  {getClassDisplay(entry)}
                                </span>
                              ) : (
                                <span className={`text-[12px] font-medium truncate max-w-[120px] ${getTextColor(cellState)}`}>
                                  {(entry.proxyRequestStatus === 'free_period' || entry.isFreePeriod || entry.proxyType === 'free_period')
                                    ? 'Free Period'
                                    : getTeacherName(entry.teacherId)}
                                </span>
                              )}
                            </div>

                            {entry.isProxy && entry.originalTeacherId?.name && (
                              <p className="text-[10px] text-emerald-600 italic">
                                for {entry.originalTeacherId.name}
                              </p>
                            )}
                            {entry.proxyRequestStatus === 'pending' && (
                              <p className="text-[10px] text-amber-600 italic">
                                Awaiting admin decision
                              </p>
                            )}
                            {entry.proxyRequestStatus === 'proxy_assigned' && entry.assignedProxyTeacher?.name && (
                              <p className="text-[10px] text-blue-600 italic">
                                Assigned to {entry.assignedProxyTeacher.name}
                              </p>
                            )}
                            {(entry.proxyRequestStatus === 'free_period' || entry.isFreePeriod || entry.proxyType === 'free_period') && entry.originalTeacherId?.name && (
                              <p className="text-[10px] text-gray-500 italic">
                                {entry.originalTeacherId.name} unavailable
                              </p>
                            )}
                          </div>

                      ) : (
                        !readOnly && (
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-6 h-6 rounded-md text-gray-400 flex items-center justify-center hover:bg-gray-100 hover:text-gray-700 transition-colors">
                              <FaPlus className="text-[10px]" />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
        {timeSlots.length === 0 && (
          <div className="p-10 text-center text-gray-400 bg-white">
            <p className="text-[13px] font-medium text-gray-600">No time slots mapped.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default TimetableGrid;
