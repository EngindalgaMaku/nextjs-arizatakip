'use client';

import { DeviceType, DeviceLocation, IssueStatus, IssuePriority, Issue } from '@/lib/supabase';

interface ViewIssueFormProps {
  issue: Issue & {
    created_at: string;
    updated_at: string | null;
    resolved_at: string | null;
  };
}

function getDeviceTypeName(type: DeviceType): string {
  const typeNames: Record<DeviceType, string> = {
    'akilli_tahta': 'Akıllı Tahta',
    'bilgisayar': 'Bilgisayar',
    'yazici': 'Yazıcı',
    'projektor': 'Projektör',
    'diger': 'Diğer'
  };
  return typeNames[type] || type;
}

function getLocationName(location: DeviceLocation): string {
  const locationNames: Record<DeviceLocation, string> = {
    'sinif': 'Sınıf',
    'laboratuvar': 'Laboratuvar',
    'idare': 'İdare',
    'ogretmenler_odasi': 'Öğretmenler Odası',
    'diger': 'Diğer'
  };
  return locationNames[location] || location;
}

function getStatusName(status: IssueStatus): string {
  const statusNames: Record<IssueStatus, string> = {
    'beklemede': 'Beklemede',
    'atandi': 'Atandı',
    'inceleniyor': 'İnceleniyor',
    'cozuldu': 'Çözüldü',
    'kapatildi': 'Kapatıldı'
  };
  return statusNames[status] || status;
}

function getPriorityName(priority: IssuePriority): string {
  const priorityNames: Record<IssuePriority, string> = {
    'dusuk': 'Düşük',
    'normal': 'Normal',
    'yuksek': 'Yüksek',
    'kritik': 'Kritik'
  };
  return priorityNames[priority] || priority;
}

export default function ViewIssueForm({ issue }: ViewIssueFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-500">Cihaz Tipi</p>
          <p className="mt-1 text-md text-gray-900">{getDeviceTypeName(issue.device_type)}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">Cihaz Adı</p>
          <p className="mt-1 text-md text-gray-900">{issue.device_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-500">Konum</p>
          <p className="mt-1 text-md text-gray-900">{getLocationName(issue.device_location)}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">Oda Numarası</p>
          <p className="mt-1 text-md text-gray-900">{issue.room_number}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-500">Bildiren Kişi</p>
          <p className="mt-1 text-md text-gray-900">{issue.reported_by}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">Atanan Kişi</p>
          <p className="mt-1 text-md text-gray-900">{issue.assigned_to || '-'}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500">Arıza Açıklaması</p>
        <p className="mt-1 text-md text-gray-900 whitespace-pre-line">{issue.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-500">Durum</p>
          <p className="mt-1 text-md text-gray-900">{getStatusName(issue.status)}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">Öncelik</p>
          <p className="mt-1 text-md text-gray-900">{getPriorityName(issue.priority)}</p>
        </div>
      </div>

      {issue.notes && (
        <div>
          <p className="text-sm font-medium text-gray-500">Notlar</p>
          <p className="mt-1 text-md text-gray-900 whitespace-pre-line">{issue.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t pt-4 mt-6">
        <div>
          <p className="text-sm font-medium text-gray-500">Oluşturulma Tarihi</p>
          <p className="mt-1 text-sm text-gray-900">{issue.created_at}</p>
        </div>
        
        {issue.updated_at && (
          <div>
            <p className="text-sm font-medium text-gray-500">Son Güncelleme</p>
            <p className="mt-1 text-sm text-gray-900">{issue.updated_at}</p>
          </div>
        )}
        
        {issue.resolved_at && (
          <div>
            <p className="text-sm font-medium text-gray-500">Çözülme Tarihi</p>
            <p className="mt-1 text-sm text-gray-900">{issue.resolved_at}</p>
          </div>
        )}
      </div>
    </div>
  );
} 