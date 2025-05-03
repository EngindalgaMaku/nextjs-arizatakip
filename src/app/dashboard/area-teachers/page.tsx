'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTeachers, createTeacher, updateTeacher, deleteTeacher, fetchBranches, Branch, createBranch } from '@/actions/teacherActions';
import { AreaTeachersTable } from '@/components/teachers/AreaTeachersTable';
import { AreaTeacherFormModal } from '@/components/teachers/AreaTeacherFormModal';
import { BranchFormModal } from '@/components/branches/BranchFormModal';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { Teacher, TeacherFormValues } from '@/types/teachers';
import { BranchFormValues } from '@/types/branches';

const ITEMS_PER_PAGE = 10;

// Define the enriched type within the page component scope
interface TeacherWithBranchName extends Teacher {
  branchName: string | null;
}

export default function AreaTeachersPage() {
  const queryClient = useQueryClient();
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Partial<Teacher> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  // Fetch teachers (returns Partial<Teacher>[] now)
  const { data: teachers = [], isLoading: isLoadingTeachers, error: errorTeachers } = useQuery<Partial<Teacher>[]>({ 
    queryKey: ['teachers'],
    queryFn: fetchTeachers,
  });

  // Fetch branches
  const { data: branches = [], isLoading: isLoadingBranches, error: errorBranches } = useQuery<Branch[]>({ 
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  // Effect to set the default branch selection once branches load
  useEffect(() => {
    // Check if branches are loaded, not loading, and default hasn't been set
    if (!isLoadingBranches && branches.length > 0 && selectedBranch === '') {
      const defaultBranch = branches.find(branch => branch.name === 'Bilişim Teknolojileri');
      if (defaultBranch) {
        setSelectedBranch(defaultBranch.id); // Set state to the ID
      }
    }
    // We only want this effect to potentially run when branches load,
    // and only *set* the default if selectedBranch is still initial.
    // Including selectedBranch in deps prevents resetting user selection.
  }, [branches, isLoadingBranches, selectedBranch]);

  // Log the branches order as received by the component
  useEffect(() => {
    if (!isLoadingBranches && branches.length > 0) {
      console.log('Branches received by component:', JSON.stringify(branches.map(b => b.name)));
    }
  }, [branches, isLoadingBranches]);

  // Create a map for branch names
  const branchesMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(branch => map.set(branch.id, branch.name));
    return map;
  }, [branches]);

  // Filter teachers based on selected branch
  const filteredTeachers = useMemo(() => {
      if (!selectedBranch) {
          return teachers; // No filter applied
      }
      return teachers.filter(teacher => teacher.branchId === selectedBranch);
  }, [teachers, selectedBranch]);

  // Reset page to 1 when filter changes
  useEffect(() => {
      setCurrentPage(1);
  }, [selectedBranch]);

  // --- Pagination Logic (using filteredTeachers) --- Start
  const totalTeachers = filteredTeachers.length;
  const totalPages = Math.ceil(totalTeachers / ITEMS_PER_PAGE);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1); // Ensure currentPage is valid

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Use safeCurrentPage for calculations
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPartialTeachers = filteredTeachers.slice(startIndex, endIndex);

  // Map paginated partial teachers to full Teacher objects with branchName
  const paginatedTeachersWithBranchName: TeacherWithBranchName[] = useMemo(() => 
      paginatedPartialTeachers.map(teacher => ({
        ...teacher,
        id: teacher.id ?? '', // Ensure ID is always string (should exist here)
        name: teacher.name ?? '', // Ensure name is string
        birthDate: teacher.birthDate ?? null,
        role: teacher.role ?? null,
        phone: teacher.phone ?? null,
        branchId: teacher.branchId ?? null,
        branchName: teacher.branchId ? branchesMap.get(teacher.branchId) ?? null : null, // Lookup branch name
      })),
    [paginatedPartialTeachers, branchesMap]);
  // --- Pagination Logic --- End

  // Combine loading states
  const isLoading = isLoadingTeachers || isLoadingBranches;
  // Combine errors (simple approach, show first error)
  const error = errorTeachers || errorBranches;

  // Mutations (remain the same, but adapt handleEdit/handleFormSubmit)
  const createTeacherMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: (data) => {
      console.log('[Create Mutation] Success:', data);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        toast.success('Öğretmen başarıyla eklendi!');
        setIsTeacherModalOpen(false);
      } else {
        toast.error(`Öğretmen eklenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Öğretmen eklenemedi: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Create teacher error:", err);
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: (vars: { id: string; payload: TeacherFormValues }) => updateTeacher(vars.id, vars.payload),
    onSuccess: (data) => {
      console.log('[Update Mutation] Success:', data);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        toast.success('Öğretmen başarıyla güncellendi!');
        setIsTeacherModalOpen(false);
        setEditingTeacher(null);
      } else {
        toast.error(`Öğretmen güncellenemedi: ${data.error}`);
      }
    },
    onError: (err, variables) => {
      toast.error(`Öğretmen güncellenemedi: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`Update teacher error (ID: ${variables.id}):`, err);
    },
  });

   const deleteTeacherMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: (data, teacherId) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        toast.success('Öğretmen başarıyla silindi!');
         // Adjust page if last item deleted - use correct variable
         if (paginatedTeachersWithBranchName.length === 1 && safeCurrentPage > 1) {
            setCurrentPage(safeCurrentPage - 1);
         }
      } else {
         toast.error(`Öğretmen silinemedi: ${data.error}`);
      }
    },
    // Fix type errors for onError parameters
    onError: (err: Error, teacherId: string) => {
       toast.error(`Öğretmen silinemedi: ${err instanceof Error ? err.message : String(err)}`);
       console.error(`Delete teacher error (ID: ${teacherId}):`, err);
    },
  });

  // --- Branch Mutation --- Start
  const createBranchMutation = useMutation({
      mutationFn: createBranch,
      onSuccess: (data) => {
          if (data.success) {
              queryClient.invalidateQueries({ queryKey: ['branches'] }); // Invalidate branches query
              toast.success(`Branş "${data.branch?.name}" başarıyla eklendi!`);
              setIsBranchModalOpen(false);
          } else {
              toast.error(`Branş eklenemedi: ${data.error}`);
          }
      },
      onError: (err: Error) => {
          toast.error(`Branş eklenemedi: ${err.message}`);
          console.error("Create branch error:", err);
      },
  });
  // --- Branch Mutation --- End

  // Handlers
  const handleAddTeacher = () => {
    setEditingTeacher(null);
    setIsTeacherModalOpen(true);
  };

  const handleEditTeacher = (teacher: TeacherWithBranchName) => {
    setEditingTeacher(teacher);
    setIsTeacherModalOpen(true);
  };

  const handleDeleteTeacher = (teacherId: string) => {
    if (window.confirm('Bu öğretmeni silmek istediğinizden emin misiniz?')) {
      deleteTeacherMutation.mutate(teacherId);
    }
  };

  // Adapt handleFormSubmit - ensure payload matches TeacherFormValues
  const handleTeacherFormSubmit = (data: TeacherFormValues) => {
    console.log('[Page] handleFormSubmit called with data:', data);
    if (editingTeacher?.id) {
       console.log('[Page] Attempting to update teacher:', editingTeacher.id);
       // Pass only TeacherFormValues fields
       const updatePayload: TeacherFormValues = {
         name: data.name, 
         birthDate: data.birthDate,
         role: data.role,
         phone: data.phone,
         branchId: data.branchId,
       };
       updateTeacherMutation.mutate({ id: editingTeacher.id, payload: updatePayload });
    } else {
       console.log('[Page] Attempting to create teacher');
       createTeacherMutation.mutate(data); // data already matches TeacherFormValues
    }
  };

  // --- Branch Handlers --- Start
  const handleAddBranch = () => {
      setIsBranchModalOpen(true);
  };

  const handleBranchFormSubmit = (data: BranchFormValues) => {
      createBranchMutation.mutate(data);
  };
  // --- Branch Handlers --- End

  const teacherMutationLoading = createTeacherMutation.isPending || updateTeacherMutation.isPending || deleteTeacherMutation.isPending;
  const branchMutationLoading = createBranchMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Öğretmenler</h1>
        <div className="flex space-x-2">
            <button
              onClick={handleAddTeacher}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Yeni Öğretmen Ekle
            </button>
            <button
              onClick={handleAddBranch}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              title="Yeni Branş Ekle"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Yeni Branş Ekle
            </button>
        </div>
      </div>
      
      {/* Filter Section */}
      <div className="mb-4">
          <label htmlFor="branchFilter" className="block text-sm font-medium text-gray-700 mb-1">Branşa Göre Filtrele:</label>
          <select 
            id="branchFilter"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={isLoadingBranches}
            className="mt-1 block w-full sm:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          >
              <option value="">-- Tüm Branşlar --</option>
              {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
          </select>
      </div>

      {isLoading && <p>Veriler yükleniyor...</p>}
      {error && <p className="text-red-600">Veriler yüklenirken bir hata oluştu: {error.message}</p>}

      {!isLoading && !error && (
        <>
          <AreaTeachersTable 
            teachers={paginatedTeachersWithBranchName} // Pass the correctly typed array
            onEdit={handleEditTeacher} 
            onDelete={handleDeleteTeacher} 
          />
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={handlePreviousPage}
                disabled={safeCurrentPage === 1 || teacherMutationLoading || branchMutationLoading}
                className="flex items-center px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Önceki
              </button>
              <span className="text-sm text-gray-600">
                Sayfa {safeCurrentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={safeCurrentPage === totalPages || teacherMutationLoading || branchMutationLoading}
                className="flex items-center px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          )}
        </>
      )}

      {isTeacherModalOpen && (
        <AreaTeacherFormModal
          initialData={editingTeacher ? {
              name: editingTeacher.name ?? '',
              birthDate: editingTeacher.birthDate || null,
              role: editingTeacher.role || null,
              phone: editingTeacher.phone || null,
              branchId: editingTeacher.branchId || null,
          } : undefined}
          onSubmit={handleTeacherFormSubmit}
          onClose={() => setIsTeacherModalOpen(false)}
          loading={teacherMutationLoading}
          branches={branches}
        />
      )}
      
      {isBranchModalOpen && (
          <BranchFormModal 
            isOpen={isBranchModalOpen}
            onSubmit={handleBranchFormSubmit}
            onClose={() => setIsBranchModalOpen(false)}
            loading={branchMutationLoading}
          />
      )}
    </div>
  );
} 