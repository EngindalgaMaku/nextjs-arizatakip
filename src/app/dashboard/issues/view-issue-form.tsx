'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Issue as SupabaseIssue, IssueStatus, IssuePriority } from '@/lib/supabase';

// Use the interface that matches IssueData from page.tsx
interface Issue extends Omit<SupabaseIssue, 'created_at' | 'updated_at' | 'resolved_at'> {
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
}

interface ViewIssueFormProps {
  issue: Issue;
  onClose?: () => void;
  onEdit?: () => void;
}

// Helper function to get priority label
function getPriorityLabel(priority: IssuePriority): string {
  switch (priority) {
    case 'dusuk':
      return 'Düşük';
    case 'normal':
      return 'Normal';
    case 'yuksek':
      return 'Yüksek';
    case 'kritik':
      return 'Kritik';
    default:
      return priority;
  }
}

// Helper function to get status label
function getStatusLabel(status: IssueStatus): string {
  switch (status) {
    case 'beklemede':
      return 'Beklemede';
    case 'atandi':
      return 'Atandı';
    case 'inceleniyor':
      return 'İnceleniyor';
    case 'cozuldu':
      return 'Çözüldü';
    case 'kapatildi':
      return 'Kapatıldı';
    default:
      return status;
  }
}

// Helper function to get status color
function getStatusColor(status: IssueStatus): string {
  switch (status) {
    case 'beklemede':
      return 'bg-yellow-100 text-yellow-800';
    case 'atandi':
      return 'bg-blue-100 text-blue-800';
    case 'inceleniyor':
      return 'bg-purple-100 text-purple-800';
    case 'cozuldu':
      return 'bg-green-100 text-green-800';
    case 'kapatildi':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Helper function to get priority color
function getPriorityColor(priority: IssuePriority): string {
  switch (priority) {
    case 'dusuk':
      return 'bg-blue-100 text-blue-800';
    case 'normal':
      return 'bg-green-100 text-green-800';
    case 'yuksek':
      return 'bg-orange-100 text-orange-800';
    case 'kritik':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Helper function to format date
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Belirtilmemiş';
  
  try {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR')} (${formatDistanceToNow(date, { addSuffix: true, locale: tr })})`;
  } catch {
    return 'Geçersiz tarih';
  }
}

export default function ViewIssueForm({ issue, onClose, onEdit }: ViewIssueFormProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Arıza Detayları</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">{issue.device_name}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(issue.status)}`}>
              {getStatusLabel(issue.status)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(issue.priority)}`}>
              {getPriorityLabel(issue.priority)}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{issue.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700">Cihaz Bilgileri</h4>
            <p className="text-gray-600">
              <span className="font-medium">Tür:</span> {issue.device_type || 'Belirtilmemiş'}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Konum:</span> {issue.device_location || 'Belirtilmemiş'}
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-700">Bildirim Bilgileri</h4>
            <p className="text-gray-600">
              <span className="font-medium">Bildiren:</span> {issue.reported_by}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Atanan Kişi:</span> {issue.assigned_to || 'Henüz atanmadı'}
            </p>
          </div>
        </div>

        {issue.notes && (
          <div>
            <h4 className="font-medium text-gray-700">Çözüm</h4>
            <p className="text-gray-600 whitespace-pre-wrap">{issue.notes}</p>
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-sm text-gray-500">
            <span className="font-medium">Oluşturulma:</span> {formatDate(issue.created_at)}
          </p>
          {issue.updated_at && (
            <p className="text-sm text-gray-500">
              <span className="font-medium">Son Güncelleme:</span> {formatDate(issue.updated_at)}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Düzenle
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 