'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { fetchScheduleEntries, saveScheduleEntries } from '@/actions/scheduleActions';
import { fetchLocations } from '@/actions/locationActions';
import { ScheduleUpsertEntry } from '@/types/schedules';
import Swal from 'sweetalert2';
import ScheduleTimeline from '@/components/schedules/ScheduleTimeline';

const dayLabels = ['Pzt', 'Salı', 'Çrş', 'Prş', 'Cum'];
const periodCount = 10;
const daysCount = 5;

export default function SchedulePage() {
  const params = useParams();
  const labId = params.labId as string;
  const router = useRouter();

  const [entries, setEntries] = useState<ScheduleUpsertEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labName, setLabName] = useState<string>('');

  // Initialize form entries (5×10) and fetch existing
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch schedule entries and lab info
        const fetched = await fetchScheduleEntries(labId);
        const locationsData = await fetchLocations();
        const loc = locationsData.find(l => l.id === labId);
        setLabName(loc?.name || '');
        // build default grid
        const grid: ScheduleUpsertEntry[] = [];
        for (let day = 1; day <= daysCount; day++) {
          for (let period = 1; period <= periodCount; period++) {
            const exist = fetched.find(e => e.day === day && e.period === period);
            grid.push({
              lab_id: labId,
              day,
              period,
              subject: exist?.subject || '',
              class_name: exist?.class_name || '',
              teacher: exist?.teacher || '',
            });
          }
        }
        setEntries(grid);
      } catch (err) {
        console.error(err);
        setError('Ders programı yüklenirken hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [labId]);

  const handleChange = (
    day: number,
    period: number,
    field: 'subject' | 'class_name' | 'teacher',
    value: string
  ) => {
    setEntries(prev =>
      prev.map(e =>
        e.day === day && e.period === period
          ? { ...e, [field]: value }
          : e
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveScheduleEntries(entries);
      if (result.success) {
        Swal.fire('Kaydedildi', 'Ders programı başarıyla kaydedildi.', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Hata', 'Kaydedilemedi: ' + (err instanceof Error ? err.message : ''), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-4">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-red-600">Hata: {error}</div>;

  return (
    <div className="p-4">
      {/* Back to locations list */}
      <div className="mb-4">
        <Link href="/dashboard/locations" className="inline-flex items-center text-indigo-600 hover:text-indigo-800">
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          Konum Listesi
        </Link>
      </div>
      {/* Lab-specific header */}
      <h1 className="text-xl font-semibold mb-4">{labName} Ders Programı</h1>
      <div className="overflow-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border p-2">Ders/Saat</th>
              {dayLabels.map((label, idx) => (
                <th key={idx} className="border p-2">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periodCount }).map((_, pIdx) => {
              const period = pIdx + 1;
              return (
                <tr key={period}>
                  <td className="border p-2 font-medium">{period}. Ders</td>
                  {Array.from({ length: daysCount }).map((_, dIdx) => {
                    const day = dIdx + 1;
                    const entry = entries.find(e => e.day === day && e.period === period);
                    return (
                      <td key={day} className="border p-1">
                        <input
                          type="text"
                          placeholder="Ders"
                          value={entry?.subject}
                          onChange={e => handleChange(day, period, 'subject', e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-sm mb-1"
                        />
                        <input
                          type="text"
                          placeholder="Sınıf"
                          value={entry?.class_name}
                          onChange={e => handleChange(day, period, 'class_name', e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-sm mb-1"
                        />
                        <input
                          type="text"
                          placeholder="Öğretmen"
                          value={entry?.teacher}
                          onChange={e => handleChange(day, period, 'teacher', e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-sm"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
        >
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
      {/* Timeline Visualization */}
      <ScheduleTimeline entries={entries} />
    </div>
  );
} 