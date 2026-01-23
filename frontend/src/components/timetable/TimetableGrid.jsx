import React from 'react';
import { FaPlus, FaMapMarkerAlt, FaChalkboardTeacher } from 'react-icons/fa';

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TimetableGrid = ({ timetableData, onCellClick, readOnly, showClass = false, timeSlots = [], teachers = [] }) => {
  // Helper to find entry for a specific slot
  const getEntry = (day, timeSlotId) => {
    return timetableData.find(
      (entry) => entry.day === day && entry.timeSlotId === timeSlotId
    );
  };

  const getTeacherName = (email) => {
    const teacher = teachers.find((t) => t.email === email);
    return teacher ? teacher.name : 'Unknown';
  };

  return (
    <div className="w-full">
      <div className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {/* Header Row */}
        <div className="grid grid-cols-[70px_repeat(6,1fr)] bg-gray-50 border-b border-gray-200">
          <div className="py-2 px-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center flex items-center justify-center border-r border-gray-100">
            Time
          </div>
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="py-2 px-1 text-xs font-bold text-gray-700 text-center border-r border-gray-100 last:border-r-0"
            >
              {day.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Time Slots */}
        {timeSlots.map((slot) => (
          <div
            key={slot.id}
            className={`grid grid-cols-[70px_repeat(6,1fr)] border-b border-gray-100 last:border-b-0 ${slot.type === 'break' ? 'bg-orange-50/50' : 'bg-white'
              }`}
          >
            {/* Time Column */}
            <div className="py-1.5 px-1 text-[10px] font-medium text-gray-500 flex flex-col items-center justify-center border-r border-gray-100 text-center leading-tight">
              <span>{slot.startTime}</span>
              <span className="text-gray-300">-</span>
              <span>{slot.endTime}</span>
              {slot.label && (
                <span className="mt-0.5 px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-[8px] font-bold uppercase">
                  Break
                </span>
              )}
            </div>

            {/* Days Columns */}
            {slot.type === 'break' ? (
              <div className="col-span-6 py-2 text-center text-[10px] font-medium text-orange-400 italic flex items-center justify-center tracking-wide uppercase opacity-75">
                {slot.label}
              </div>
            ) : (
              daysOfWeek.map((day) => {
                const entry = getEntry(day, slot.id);

                return (
                  <div
                    key={`${day}-${slot.id}`}
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
                            {entry.subject}
                          </h4>
                          <div className="flex items-center text-gray-500 mt-0.5">
                            {showClass ? (
                              <span className="font-medium text-purple-600 truncate">{entry.classId}</span>
                            ) : (
                              <>
                                <FaChalkboardTeacher className="mr-1 text-blue-400 text-[8px]" />
                                <span className="truncate">{getTeacherName(entry.teacherEmail)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {entry.room && (
                          <div className="flex items-center text-gray-400 mt-0.5">
                            <FaMapMarkerAlt className="mr-0.5 text-[8px]" />
                            <span>{entry.room}</span>
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
        ))}
      </div>
    </div>
  );
};

export default TimetableGrid;
