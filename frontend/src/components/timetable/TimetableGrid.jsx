import React from 'react';
import { FaPlus, FaMapMarkerAlt, FaChalkboardTeacher } from 'react-icons/fa';
import { DAYS_OF_WEEK, DAY_MAP_REVERSE } from '../../api/timetable';

/**
 * TimetableGrid Component
 * Displays the timetable grid with days as columns and time slots as rows
 * 
 * Props:
 * - entries: Array of TimetableEntry objects from API
 * - timeSlots: Array of TimeSlot objects from API
 * - teachers: Array of teacher objects for name lookup
 * - onCellClick: Callback when a cell is clicked (day, slot, entry)
 * - readOnly: Boolean to disable editing
 * - showClass: Boolean to show class instead of teacher name
 */
const TimetableGrid = ({
  entries = [],
  timeSlots = [],
  teachers = [],
  onCellClick,
  readOnly = false,
  showClass = false
}) => {
  // Helper to find entry for a specific day and time slot
  const getEntry = (dayOfWeek, timeSlotId) => {
    return entries.find(
      (entry) => entry.dayOfWeek === dayOfWeek &&
        (entry.timeSlotId?._id || entry.timeSlotId) === timeSlotId
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

  // Format time display from slot
  const formatSlotTime = (slot) => {
    return {
      start: slot.startTime,
      end: slot.endTime
    };
  };

  return (
    <div className="w-full">
      <div className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {/* Header Row */}
        <div className="grid grid-cols-[70px_repeat(6,1fr)] bg-gray-50 border-b border-gray-200">
          <div className="py-2 px-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center flex items-center justify-center border-r border-gray-100">
            Time
          </div>
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="py-2 px-1 text-xs font-bold text-gray-700 text-center border-r border-gray-100 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Time Slots */}
        {timeSlots.map((slot) => {
          const time = formatSlotTime(slot);
          const isBreak = slot.slotType === 'BREAK';

          return (
            <div
              key={slot._id}
              className={`grid grid-cols-[70px_repeat(6,1fr)] border-b border-gray-100 last:border-b-0 ${isBreak ? 'bg-orange-50/50' : 'bg-white'
                }`}
            >
              {/* Time Column */}
              <div className="py-1.5 px-1 text-[10px] font-medium text-gray-500 flex flex-col items-center justify-center border-r border-gray-100 text-center leading-tight">
                <span>{time.start}</span>
                <span className="text-gray-300">-</span>
                <span>{time.end}</span>
                {isBreak && (
                  <span className="mt-0.5 px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-[8px] font-bold uppercase">
                    Break
                  </span>
                )}
              </div>

              {/* Days Columns */}
              {isBreak ? (
                <div className="col-span-6 py-2 text-center text-[10px] font-medium text-orange-400 italic flex items-center justify-center tracking-wide uppercase opacity-75">
                  {slot.label || 'Break'}
                </div>
              ) : (
                DAYS_OF_WEEK.map((day) => {
                  const entry = getEntry(day, slot._id);

                  return (
                    <div
                      key={`${day}-${slot._id}`}
                      onClick={() => !readOnly && onCellClick(day, slot, entry)}
                      className={`min-h-[60px] p-1 border-r border-gray-100 last:border-r-0 transition-all duration-150 relative group ${!readOnly ? 'cursor-pointer hover:bg-blue-50/30' : ''
                        }`}
                    >
                      {entry ? (
                        <div className={`h-full flex flex-col justify-between rounded p-1.5 border transition-all text-[10px] ${showClass
                            ? 'bg-purple-50 border-purple-100'
                            : 'bg-blue-50 border-blue-100'
                          }`}>
                          <div>
                            <h4 className="font-semibold text-gray-800 leading-tight line-clamp-1">
                              {entry.subject || 'No Subject'}
                            </h4>
                            <div className="flex items-center text-gray-500 mt-0.5">
                              {showClass ? (
                                <span className="font-medium text-purple-600 truncate">
                                  {getClassDisplay(entry)}
                                </span>
                              ) : (
                                <>
                                  <FaChalkboardTeacher className="mr-1 text-blue-400 text-[8px]" />
                                  <span className="truncate">
                                    {getTeacherName(entry.teacherId)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {entry.roomNumber && (
                            <div className="flex items-center text-gray-400 mt-0.5">
                              <FaMapMarkerAlt className="mr-0.5 text-[8px]" />
                              <span>{entry.roomNumber}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        !readOnly && (
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
                              <FaPlus className="text-[8px]" />
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
          <div className="p-8 text-center text-gray-400">
            <p>No time slots defined yet.</p>
            <p className="text-sm mt-1">Admin needs to create time slots first.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableGrid;
