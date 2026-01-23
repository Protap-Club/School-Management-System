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
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[1000px] border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Header Row */}
        <div className="grid grid-cols-[100px_repeat(6,1fr)] bg-gray-50 border-b border-gray-200">
          <div className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center flex items-center justify-center border-r border-gray-100">
            Time
          </div>
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="p-4 text-sm font-bold text-gray-700 text-center border-r border-gray-100 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Time Slots */}
        {timeSlots.map((slot) => (
          <div
            key={slot.id}
            className={`grid grid-cols-[100px_repeat(6,1fr)] border-b border-gray-100 last:border-b-0 ${slot.type === 'break' ? 'bg-orange-50/50' : 'bg-white'
              }`}
          >
            {/* Time Column */}
            <div className="p-3 text-xs font-medium text-gray-500 flex flex-col items-center justify-center border-r border-gray-100 text-center">
              <span>{slot.startTime}</span>
              <span className="text-gray-300 my-1">|</span>
              <span>{slot.endTime}</span>
              {slot.label && (
                <span className="mt-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-bold uppercase tracking-wide">
                  {slot.label}
                </span>
              )}
            </div>

            {/* Days Columns */}
            {slot.type === 'break' ? (
              <div className="col-span-6 p-4 text-center text-sm font-medium text-orange-400 italic flex items-center justify-center tracking-widest uppercase opacity-75">
                {slot.label}
              </div>
            ) : (
              daysOfWeek.map((day) => {
                const entry = getEntry(day, slot.id);

                return (
                  <div
                    key={`${day}-${slot.id}`}
                    onClick={() => !readOnly && onCellClick(day, slot, entry)}
                    className={`min-h-[120px] p-2 border-r border-gray-100 last:border-r-0 transition-all duration-200 relative group ${!readOnly ? 'cursor-pointer hover:bg-gray-50' : ''
                      }`}
                  >
                    {entry ? (
                      <div className={`h-full flex flex-col justify-between rounded-lg p-2 border shadow-sm transition-all ${showClass
                        ? 'bg-purple-50 border-purple-100 hover:shadow-md'
                        : 'bg-white border-blue-100 hover:shadow-md group-hover:border-blue-200'
                        }`}>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2">
                            {entry.subject}
                          </h4>
                          <div className="flex items-center text-xs text-gray-500 mb-1">
                            {showClass ? (
                              <>
                                <span className="font-semibold text-purple-600 truncate">{entry.classId}</span>
                              </>
                            ) : (
                              <>
                                <FaChalkboardTeacher className="mr-1.5 text-blue-400" />
                                <span className="truncate">{getTeacherName(entry.teacherEmail)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {entry.room && (
                          <div className="flex items-center text-xs text-gray-400 bg-white/50 px-2 py-1 rounded w-fit">
                            <FaMapMarkerAlt className="mr-1.5" />
                            <span>Room {entry.room}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      !readOnly && (
                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shadow-sm">
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
        ))}
      </div>
    </div>
  );
};

export default TimetableGrid;
