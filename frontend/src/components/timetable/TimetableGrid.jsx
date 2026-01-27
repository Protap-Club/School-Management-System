import React from 'react';
import { FaPlus, FaMapMarkerAlt, FaChalkboardTeacher } from 'react-icons/fa';
import { DAYS_OF_WEEK } from '../../api/timetable';

/**
 * TimetableGrid Component
 * Displays the timetable grid with days as columns and time slots as rows
 * Matches the reference design with stacked time display and full-width breaks
 */
const TimetableGrid = ({
  entries = [],
  timeSlots = [],
  teachers = [],
  onCellClick,
  readOnly = false,
  showClass = false
}) => {
  // Helper to get slot identifier (works with both backend _id and default slotNumber)
  const getSlotId = (slot) => slot._id || slot.slotNumber;

  // Helper to find entry for a specific day and time slot
  const getEntry = (dayOfWeek, slot) => {
    const slotId = getSlotId(slot);
    return entries.find(
      (entry) => entry.dayOfWeek === dayOfWeek &&
        (entry.timeSlotId?._id || entry.timeSlotId || entry.timeSlotId?.slotNumber) === slotId
    );
  };

  // Get teacher name by ID
  const getTeacherName = (teacherId) => {
    if (!teacherId) return 'Unassigned';
    const id = teacherId?._id || teacherId;
    const teacher = teachers.find((t) => t._id === id);
    return teacher ? teacher.name : 'Unknown';
  };

  // Get class display from timetable
  const getClassDisplay = (entry) => {
    if (entry.timetableId) {
      const tt = entry.timetableId;
      return `${tt.standard}-${tt.section}`;
    }
    return '';
  };

  // Format time to 12-hour format (e.g., "10:00" -> "10:00 AM")
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="w-full">
      <div className="w-full border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Header Row */}
        <div className="grid grid-cols-[100px_repeat(6,1fr)] bg-gray-50 border-b border-gray-200">
          <div className="py-3 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-center border-r border-gray-100">
            TIME
          </div>
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="py-3 px-2 text-sm font-bold text-gray-700 text-center border-r border-gray-100 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Time Slots */}
        {timeSlots.map((slot) => {
          const isBreak = slot.slotType === 'BREAK';
          const slotId = getSlotId(slot);

          return (
            <div
              key={slotId}
              className={`grid border-b border-gray-100 last:border-b-0 ${isBreak
                  ? 'grid-cols-[100px_1fr] bg-amber-50/60'
                  : 'grid-cols-[100px_repeat(6,1fr)]'
                }`}
            >
              {/* Time Column */}
              <div className={`py-3 px-2 flex flex-col items-center justify-center border-r border-gray-100 text-center ${isBreak ? 'bg-amber-50' : ''
                }`}>
                <span className="text-xs font-medium text-gray-600">
                  {formatTime(slot.startTime)}
                </span>
                <span className="text-xs font-medium text-gray-600">
                  {formatTime(slot.endTime)}
                </span>
                {isBreak && (
                  <span className="mt-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-bold uppercase">
                    Break
                  </span>
                )}
              </div>

              {/* Break Row - Full Width */}
              {isBreak ? (
                <div className="py-4 flex items-center justify-center">
                  <span className="text-sm font-medium text-orange-400 uppercase tracking-widest">
                    {slot.label || 'Break'}
                  </span>
                </div>
              ) : (
                /* Days Columns */
                DAYS_OF_WEEK.map((day) => {
                  const entry = getEntry(day, slot);

                  return (
                    <div
                      key={`${day}-${slotId}`}
                      onClick={() => !readOnly && onCellClick(day, slot, entry)}
                      className={`min-h-[70px] p-2 border-r border-gray-100 last:border-r-0 transition-all duration-150 relative group ${!readOnly ? 'cursor-pointer hover:bg-blue-50/40' : ''
                        }`}
                    >
                      {entry ? (
                        <div className={`h-full flex flex-col justify-between rounded-lg p-2 border transition-all ${showClass
                            ? 'bg-purple-50 border-purple-200'
                            : 'bg-blue-50 border-blue-200'
                          }`}>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-1">
                              {entry.subject || 'No Subject'}
                            </h4>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              {showClass ? (
                                <span className="font-medium text-purple-600 truncate">
                                  {getClassDisplay(entry)}
                                </span>
                              ) : (
                                <>
                                  <FaChalkboardTeacher className="mr-1 text-blue-400 text-[10px]" />
                                  <span className="truncate">
                                    {getTeacherName(entry.teacherId)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {entry.roomNumber && (
                            <div className="flex items-center text-xs text-gray-400 mt-1">
                              <FaMapMarkerAlt className="mr-1 text-[10px]" />
                              <span>{entry.roomNumber}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        !readOnly && (
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shadow-sm">
                              <FaPlus className="text-xs" />
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

        {/* Empty state if no time slots */}
        {timeSlots.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">No time slots defined yet.</p>
            <p className="text-sm mt-2">Admin needs to create time slots first.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableGrid;
