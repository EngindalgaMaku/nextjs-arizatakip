'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getReceiptsForAdmin, getReceiptDownloadUrl, AdminReceiptListItem } from '@/actions/business-receipts/admin-actions';
import { deleteReceiptAndFile } from '@/actions/business-receipts/receipt-actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ArrowDownTrayIcon, FunnelIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const ITEMS_PER_PAGE = 10;
const monthNames: { [key: number]: string } = {
    1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
    7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık'
};

interface FiltersState {
    studentName?: string;
    schoolNumber?: string;
    className?: string;
    businessName?: string;
    month?: string; // string for select compatibility
    year?: string;  // string for select compatibility
}

function AdminBusinessReceiptsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const [receipts, setReceipts] = useState<AdminReceiptListItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
    const [filters, setFilters] = useState<FiltersState>(() => {
        const params: FiltersState = {};
        if (searchParams.get('studentName')) params.studentName = searchParams.get('studentName')!;
        if (searchParams.get('schoolNumber')) params.schoolNumber = searchParams.get('schoolNumber')!;
        if (searchParams.get('className')) params.className = searchParams.get('className')!;
        if (searchParams.get('businessName')) params.businessName = searchParams.get('businessName')!;
        if (searchParams.get('month')) params.month = searchParams.get('month')!;
        if (searchParams.get('year')) params.year = searchParams.get('year')!;
        return params;
    });

    const deleteReceiptMutation = useMutation({
        mutationFn: (params: { receiptId: string; filePath: string }) => deleteReceiptAndFile(params.receiptId, params.filePath),
        onSuccess: () => {
            toast.success('Dekont başarıyla silindi!');
            queryClient.invalidateQueries({ queryKey: ['adminReceipts', /* include filter params if they are part of the query key */] });
            fetchAdminReceipts(currentPage, filters);
        },
        onError: (error) => {
            toast.error(error.message || 'Dekont silinirken bir hata oluştu.');
        },
    });

    const fetchAdminReceipts = useCallback(async (page: number, currentFilters: FiltersState) => {
        setIsLoading(true);
        setError(null);
        try {
            const apiFilters = {
                ...currentFilters,
                month: currentFilters.month ? parseInt(currentFilters.month) : undefined,
                year: currentFilters.year ? parseInt(currentFilters.year) : undefined,
                page,
                pageSize: ITEMS_PER_PAGE,
            };
            const result = await getReceiptsForAdmin(apiFilters);
            if (result.error || !result.data) {
                setError(result.error || 'Dekontlar alınamadı.');
                setReceipts([]);
                setTotalCount(0);
            } else {
                setReceipts(result.data);
                setTotalCount(result.count || 0);
            }
        } catch (e) {
            setError('Dekontlar yüklenirken bir hata oluştu.');
            setReceipts([]);
            setTotalCount(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdminReceipts(currentPage, filters);
    }, [currentPage, filters, fetchAdminReceipts]);

    const handleFilterInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFilterSelectChange = (name: keyof FiltersState, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setCurrentPage(1);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });
        params.set('page', '1');
        router.push(`/dashboard/business-receipts?${params.toString()}`);
    };

    const clearFilters = () => {
        setFilters({});
        setCurrentPage(1);
        router.push('/dashboard/business-receipts?page=1');
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        router.push(`/dashboard/business-receipts?${params.toString()}`);
    };

    const handleDownload = async (filePath: string, fileName?: string | null) => {
        toast.loading('İndirme linki oluşturuluyor...');
        const result = await getReceiptDownloadUrl(filePath);
        if (result.data?.downloadUrl) {
            toast.dismiss();
            const link = document.createElement('a');
            link.href = result.data.downloadUrl;
            if (fileName) link.download = fileName; else link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('İndirme başladı!');
        } else {
            toast.error(result.error || 'İndirme linki alınamadı.');
        }
    };

    const handleDeleteReceipt = (receiptId: string, filePath: string) => {
        if (window.confirm('Bu dekontu ve ilişkili dosyayı kalıcı olarak silmek istediğinizden emin misiniz?')) {
            deleteReceiptMutation.mutate({ receiptId, filePath });
        }
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-3xl font-bold mb-6">İşletme Dekontları Yönetimi</h1>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <FunnelIcon className="h-6 w-6 mr-2" /> Filtrele
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input placeholder="Öğrenci Adı" name="studentName" value={filters.studentName || ''} onChange={handleFilterInputChange} />
                    <Input placeholder="Okul Numarası" name="schoolNumber" value={filters.schoolNumber || ''} onChange={handleFilterInputChange} />
                    <Input placeholder="Sınıf Adı (örn: 12A)" name="className" value={filters.className || ''} onChange={handleFilterInputChange} />
                    <Input placeholder="İşletme Adı" name="businessName" value={filters.businessName || ''} onChange={handleFilterInputChange} />
                    <Select name="month" value={filters.month || undefined} onValueChange={(value) => handleFilterSelectChange('month', value)}>
                        <SelectTrigger><SelectValue placeholder="Ay Seçin" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tüm Aylar</SelectItem>
                            {Object.entries(monthNames).map(([num, name]) => <SelectItem key={num} value={num}>{name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select name="year" value={filters.year || undefined} onValueChange={(value) => handleFilterSelectChange('year', value)}>
                        <SelectTrigger><SelectValue placeholder="Yıl Seçin" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tüm Yıllar</SelectItem>
                            {yearOptions.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <div className="flex space-x-2 md:col-span-2 lg:col-span-1 lg:justify-self-end">
                        <Button onClick={applyFilters} className="w-full sm:w-auto">Filtrele</Button>
                        <Button onClick={clearFilters} variant="outline" className="w-full sm:w-auto flex items-center">
                            <XCircleIcon className="h-5 w-5 mr-1"/> Temizle
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <p className="text-center py-4">Dekontlar yükleniyor...</p>}
            {error && <Alert variant="destructive" className="mb-4"><AlertTitle>Hata!</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

            {!isLoading && !error && (
                <Card>
                    <CardHeader>
                        <CardTitle>Dekont Listesi ({totalCount} kayıt)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Öğrenci</TableHead>
                                    <TableHead>Okul No</TableHead>
                                    <TableHead>Sınıf</TableHead>
                                    <TableHead>İşletme</TableHead>
                                    <TableHead>Dönem</TableHead>
                                    <TableHead>Yüklenme</TableHead>
                                    <TableHead>Not</TableHead>
                                    <TableHead className="text-right">İşlemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receipts.length > 0 ? receipts.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.student_name || '-'}</TableCell>
                                        <TableCell>{r.student_school_number || '-'}</TableCell>
                                        <TableCell>{r.student_class_name || '-'}</TableCell>
                                        <TableCell>{r.business_name || '-'}</TableCell>
                                        <TableCell>{monthNames[r.month]} {r.year}</TableCell>
                                        <TableCell>{r.uploaded_at}</TableCell>
                                        <TableCell className="max-w-[150px] truncate" title={r.notes || undefined}>{r.notes || '-'}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleDownload(r.file_path, r.file_name_original)} title="İndir">
                                                <ArrowDownTrayIcon className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteReceipt(r.id, r.file_path)} title="Sil" disabled={deleteReceiptMutation.isPending}>
                                                {deleteReceiptMutation.isPending && deleteReceiptMutation.variables?.receiptId === r.id ? <span className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full" role="status" aria-label="loading"></span> : <TrashIcon className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center">Filtre kriterlerine uygun dekont bulunamadı.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {totalPages > 1 && (
                <Pagination className="mt-6">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious 
                                href="#" 
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    if(currentPage > 1) handlePageChange(currentPage - 1);
                                }}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                        </PaginationItem>
                        {[...Array(totalPages)].map((_, i) => (
                            <PaginationItem key={i}>
                                <PaginationLink 
                                    href="#" 
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        handlePageChange(i + 1); 
                                    }} 
                                    isActive={currentPage === i + 1}
                                >
                                    {i + 1}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext 
                                href="#" 
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    if(currentPage < totalPages) handlePageChange(currentPage + 1);
                                }}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}

export default function AdminBusinessReceiptsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto p-8 text-center">Yönetim paneli yükleniyor...</div>}>
            <AdminBusinessReceiptsContent />
        </Suspense>
    );
} 