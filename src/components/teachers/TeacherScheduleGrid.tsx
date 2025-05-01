'use client';

import React from 'react';
import {
  DAYS_OF_WEEK,
  TIME_SLOTS,
  TeacherScheduleEntry,
  TeacherScheduleGridData
} from '@/types/teacherSchedules';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface TeacherScheduleGridProps {
  scheduleData: TeacherScheduleEntry[];
  onAdd: (dayOfWeek: number, timeSlot: number) => void;
  onEdit: (entry: TeacherScheduleEntry) => void;
  onDelete: (entryId: string) => void;
}

// Helper to transform fetched data into a grid structure
const transformDataForGrid = (data: TeacherScheduleEntry[]): TeacherScheduleGridData => {
  const gridData: TeacherScheduleGridData = {};
  DAYS_OF_WEEK.forEach(day => {
    gridData[day.id] = {};
    TIME_SLOTS.forEach(slot => {
      gridData[day.id][slot.id] = null;
    });
  });

  data.forEach(entry => {
    if (gridData[entry.dayOfWeek] && gridData[entry.dayOfWeek][entry.timeSlot] !== undefined) {
      gridData[entry.dayOfWeek][entry.timeSlot] = entry;
    }
  });
  return gridData;
};

export function TeacherScheduleGrid({ scheduleData, onAdd, onEdit, onDelete }: TeacherScheduleGridProps) {
  const gridData = transformDataForGrid(scheduleData);

  return (
    <div className="overflow-x-auto shadow rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
              Saat
            </th>
            {DAYS_OF_WEEK.map(day => (
              <th key={day.id} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                {day.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {TIME_SLOTS.map(slot => (
            <tr key={slot.id} className="divide-x divide-gray-200">
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                {slot.time}
              </td>
              {DAYS_OF_WEEK.map(day => {
                const entry = gridData[day.id]?.[slot.id];
                return (
                  <td key={`${day.id}-${slot.id}`} className="px-4 py-4 whitespace-normal text-sm text-gray-700 text-center relative group border-r h-24 align-top">
                    {entry ? (
                      <div className="flex flex-col items-center justify-between h-full">
                        <div className="text-center">
                            <p className="font-semibold">{entry.className || '-'}</p>
                            {entry.locationName && <p className="text-xs text-gray-500">({entry.locationName})</p>}
                        </div>
                        <div className="absolute bottom-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(entry)}
                            className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-100"
                            title="Düzenle"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(entry.id)}
                            className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-100"
                            title="Sil"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                         <button
                            onClick={() => onAdd(day.id, slot.id)}
                            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Ekle"
                          >
                           <PlusIcon className="h-5 w-5" />
                         </button>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 