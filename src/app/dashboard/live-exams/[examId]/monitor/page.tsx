'use client';

import { getLiveExamById, getLiveExamParticipants } from '@/actions/liveExamActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LiveExam, LiveExamParticipant, LiveExamStatus, ParticipantStatus } from '@/types/tests';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Hourglass, RefreshCw, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Function to format date and time
const formatDateTime = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const getParticipantStatusBadge = (status: LiveExamParticipant['status']) => {
  switch (status) {
    case ParticipantStatus.REGISTERED:
      return <Badge variant="outline">Kayıtlı</Badge>;
    case ParticipantStatus.IN_PROGRESS:
      return <Badge variant="secondary">Devam Ediyor</Badge>;
    case ParticipantStatus.COMPLETED:
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Tamamladı</Badge>;
    case ParticipantStatus.ABANDONED:
      return <Badge variant="destructive">Terk Etti</Badge>;
    case ParticipantStatus.TIMED_OUT:
      return <Badge variant="destructive">Süre Doldu</Badge>;
    default:
      return <Badge variant="outline">Bilinmiyor</Badge>;
  }
};

export default function LiveExamMonitorPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  const [liveExam, setLiveExam] = useState<LiveExam | null>(null);
  const [participants, setParticipants] = useState<LiveExamParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!examId) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const examData = await getLiveExamById(examId);
      if (examData) {
        setLiveExam(examData);
      } else {
        setError('Canlı sınav bulunamadı.');
        toast.error('Canlı sınav bulunamadı.');
        setLiveExam(null); // Clear previous data if any
      }

      const participantsData = await getLiveExamParticipants(examId);
      setParticipants(participantsData);

    } catch (err) {
      console.error('Error fetching live exam monitor data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Veri yüklenirken bilinmeyen bir hata oluştu.';
      setError(errorMessage);
      toast.error(`Veriler yüklenemedi: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [examId]);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!isLoading && !error && liveExam?.status === LiveExamStatus.ACTIVE) { // Only refresh if exam is active
        const intervalId = setInterval(() => {
        fetchData();
        }, 30000); // 30 saniye
        return () => clearInterval(intervalId);
    }
  }, [isLoading, error, liveExam?.status, fetchData]);


  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCw className="mr-2 h-8 w-8 animate-spin" />
        <p className="text-lg">İzleme verileri yükleniyor...</p>
      </div>
    );
  }

  if (error && !liveExam) { // If there's a critical error and no exam data
    return (
      <div className="container mx-auto p-4 md:p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-red-600">Hata</h2>
        <p className="text-red-500">{error}</p>
        <Button onClick={() => router.push('/dashboard/live-exams')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Canlı Sınav Listesine Dön
        </Button>
      </div>
    );
  }
  
  if (!liveExam) {
    return (
      <div className="container mx-auto p-4 md:p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-500" />
        <h2 className="mt-4 text-xl font-semibold">Canlı Sınav Bulunamadı</h2>
        <p>Belirtilen ID ile bir canlı sınav bulunamadı veya yüklenemedi.</p>
        <Button onClick={() => router.push('/dashboard/live-exams')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Canlı Sınav Listesine Dön
        </Button>
      </div>
    );
  }
  
  const totalParticipants = participants.length;
  const completedParticipants = participants.filter(p => p.status === ParticipantStatus.COMPLETED || p.status === ParticipantStatus.TIMED_OUT).length;
  const inProgressParticipants = participants.filter(p => p.status === ParticipantStatus.IN_PROGRESS).length;


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/live-exams')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Sınav Listesine Dön
        </Button>
        <h1 className="text-2xl font-bold text-center flex-1">Sınav İzleme: {liveExam.title}</h1>
        <Button onClick={fetchData} disabled={isRefreshing} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sınav Detayları</CardTitle>
          <CardDescription>Canlı sınavın genel durumu ve bilgileri.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div><strong>Durum:</strong> <Badge variant={liveExam.status === LiveExamStatus.ACTIVE ? 'default' : (liveExam.status === LiveExamStatus.COMPLETED ? 'outline' : 'secondary')} className={liveExam.status === LiveExamStatus.ACTIVE ? 'bg-green-500' : ''}>{liveExam.status}</Badge></div>
          <div><strong>Planlanan Başlangıç:</strong> {formatDateTime(liveExam.scheduledStartTime)}</div>
          <div><strong>Planlanan Bitiş:</strong> {formatDateTime(liveExam.scheduledEndTime)}</div>
          {liveExam.actualStartTime && <div><strong>Gerçek Başlangıç:</strong> {formatDateTime(liveExam.actualStartTime)}</div>}
          {liveExam.actualEndTime && <div><strong>Gerçek Bitiş:</strong> {formatDateTime(liveExam.actualEndTime)}</div>}
          <div><Users className="inline mr-1 h-4 w-4" /> <strong>Kayıtlı Katılımcı:</strong> {totalParticipants}</div>
          <div><CheckCircle className="inline mr-1 h-4 w-4 text-green-600" /> <strong>Tamamlayan:</strong> {completedParticipants}</div>
          <div><Hourglass className="inline mr-1 h-4 w-4 text-blue-600" /> <strong>Devam Eden:</strong> {inProgressParticipants}</div>
          <div><Clock className="inline mr-1 h-4 w-4" /> <strong>Sınav Süresi:</strong> {liveExam.timeLimit} dakika</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Katılımcı Listesi</CardTitle>
          <CardDescription>Sınava kayıtlı öğrencilerin durumları ve ilerlemeleri.</CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Bu sınav için henüz katılımcı bulunmamaktadır.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Öğrenci ID</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Başlama Zamanı</TableHead>
                  <TableHead>Teslim Zamanı</TableHead>
                  <TableHead>İlerleme (%)</TableHead>
                  {/* <TableHead>Son Aktiflik</TableHead> */}
                  {/* <TableHead>Puan</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{participant.studentId /* TODO: Öğrenci adını getir */}</TableCell>
                    <TableCell>{getParticipantStatusBadge(participant.status)}</TableCell>
                    <TableCell>{formatDateTime(participant.startTime)}</TableCell>
                    <TableCell>{formatDateTime(participant.submitTime)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Progress value={participant.progress || 0} className="w-24 mr-2 h-2.5" /> 
                        <span>{participant.progress || 0}%</span>
                      </div>
                    </TableCell>
                    {/* <TableCell>{formatDateTime(participant.lastActiveTime)}</TableCell> */}
                    {/* <TableCell>{participant.score !== null && participant.score !== undefined ? participant.score : 'N/A'}</TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 