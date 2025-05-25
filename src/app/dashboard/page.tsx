"use client";

import { useEffect, useState } from "react";
import { getDashboardStats } from "@/actions/dashboardActions";
import { fetchDevices } from "@/actions/deviceActions";
import { getLiveExams } from "@/actions/liveExamActions";
import { fetchForms } from "@/actions/formActions";
import Link from "next/link";
import { UsersIcon, DevicePhoneMobileIcon, DocumentTextIcon, ClipboardDocumentListIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import { Bar } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [statsRes, devicesRes, examsRes, formsRes] = await Promise.all([
        getDashboardStats(),
        fetchDevices(),
        getLiveExams(),
        fetchForms(),
      ]);
      setStats(statsRes);
      setDevices(devicesRes);
      setExams(examsRes);
      setForms(formsRes);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-xl">Yükleniyor...</div>;
  }

  // Bar chart için veri hazırlama
  const timelineData = stats?.timelineData || [];
  const chartData = {
    labels: timelineData.map((d: any) => d.date.slice(5)),
    datasets: [
      {
        label: "Arıza Sayısı",
        data: timelineData.map((d: any) => d.count),
        backgroundColor: "#6366f1",
        borderRadius: 6,
        maxBarThickness: 18,
      },
    ],
  };
  const chartOptions = {
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: "#f3f4f6" } },
    },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-white min-h-screen">
      <h1 className="text-4xl font-extrabold mb-8 text-blue-900">Yönetim Paneli</h1>
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
        <StatCard icon={<DevicePhoneMobileIcon className="h-8 w-8" />} label="Cihazlar" value={devices.length} href="/dashboard/devices" color="from-blue-400 to-blue-600" />
        <StatCard icon={<ClipboardDocumentListIcon className="h-8 w-8" />} label="Arızalar" value={stats?.totalIssuesCount ?? 0} href="/dashboard/issues" color="from-orange-400 to-orange-600" />
        <StatCard icon={<UsersIcon className="h-8 w-8" />} label="Kullanıcılar" value={stats?.usersCount ?? 0} href="/dashboard/users" color="from-green-400 to-green-600" />
        <StatCard icon={<AcademicCapIcon className="h-8 w-8" />} label="Sınavlar" value={exams.length} href="/dashboard/live-exams" color="from-purple-400 to-purple-600" />
        <StatCard icon={<DocumentTextIcon className="h-8 w-8" />} label="Formlar" value={forms.length} href="/dashboard/forms" color="from-pink-400 to-pink-600" />
      </div>
      {/* Grafik ve Son Eklenenler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Son 30 Gün Arıza Grafiği</h2>
          <Bar data={chartData} options={chartOptions} height={180} />
        </div>
        <div className="grid grid-cols-1 gap-6">
          <RecentList title="Son Cihazlar" items={devices.slice(0, 5)} itemKey="id" itemLabel="name" hrefPrefix="/dashboard/devices/" badgeColor="bg-blue-100 text-blue-700" />
          <RecentList title="Son Sınavlar" items={exams.slice(0, 5)} itemKey="id" itemLabel="title" hrefPrefix="/dashboard/live-exams/" badgeColor="bg-purple-100 text-purple-700" />
          <RecentList title="Son Formlar" items={forms.slice(0, 5)} itemKey="id" itemLabel="title" hrefPrefix="/dashboard/forms/" badgeColor="bg-pink-100 text-pink-700" />
        </div>
      </div>
      {/* Hızlı Aksiyonlar */}
      <div className="bg-white rounded-xl shadow p-6 flex flex-wrap gap-4 justify-center">
        <Link href="/dashboard/devices/new" className="quick-action-btn">Cihaz Ekle</Link>
        <Link href="/dashboard/live-exams/new" className="quick-action-btn">Sınav Oluştur</Link>
        <Link href="/dashboard/forms/new" className="quick-action-btn">Form Oluştur</Link>
        <Link href="/dashboard/issues/new" className="quick-action-btn">Arıza Bildir</Link>
      </div>
      <style jsx>{`
        .quick-action-btn {
          @apply bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 transition font-semibold;
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, href, color }: { icon: React.ReactNode; label: string; value: number; href: string; color: string }) {
  return (
    <Link href={href} className={`rounded-2xl shadow-lg flex flex-col items-center p-6 hover:scale-105 transition group bg-gradient-to-br ${color} text-white`}>
      <div className="mb-2 bg-white bg-opacity-20 rounded-full p-3 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-3xl font-bold group-hover:text-yellow-200">{value}</div>
      <div className="text-lg mt-1 font-semibold">{label}</div>
    </Link>
  );
}

function RecentList({ title, items, itemKey, itemLabel, hrefPrefix, badgeColor }: { title: string; items: any[]; itemKey: string; itemLabel: string; hrefPrefix: string; badgeColor: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <ul>
        {items.length === 0 && <li className="text-gray-400">Kayıt yok</li>}
        {items.map(item => (
          <li key={item[itemKey]} className="mb-2 flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}>{item[itemLabel]?.[0] || "?"}</span>
            <Link href={hrefPrefix + item[itemKey]} className="text-blue-700 hover:underline font-medium">
              {item[itemLabel] || "(İsimsiz)"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 