"use client";

import React from 'react';
import { ScheduleUpsertEntry } from '@/types/schedules';
import ScheduleTimeline from '@/components/schedules/ScheduleTimeline';

interface LocationScheduleProps {
  entries: ScheduleUpsertEntry[];
}

export default function LocationSchedule({ entries }: LocationScheduleProps) {
  if (!entries || entries.length === 0) {
    return null;
  }
  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-2 text-center">Ders Programı</h2>
      <ScheduleTimeline entries={entries} />
    </div>
  );
} 