'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTeachers, createTeacher, updateTeacher, deleteTeacher } from '@/actions/teacherActions';
import { AreaTeachersTable } from '@/components/teachers/AreaTeachersTable';
import { AreaTeacherFormModal } from '@/components/teachers/AreaTeacherFormModal';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { Teacher, TeacherFormValues } from '@/types/teachers';

export default function AreaTeachersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Fetch teachers
  const { data: teachers = [], isLoading, error } = useQuery<Teacher[]>({ 
    queryKey: ['teachers'],
    queryFn: fetchTeachers,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: (data) => {
      console.log('[Create Mutation] Success:', data);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        toast.success('Alan öğretmeni başarıyla eklendi!');
        setIsModalOpen(false);
      } else {
        toast.error(`Öğretmen eklenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Öğretmen eklenemedi: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Create teacher error:", err);
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: TeacherFormValues }) => updateTeacher(vars.id, vars.payload),
    onSuccess: (data) => {
      console.log('[Update Mutation] Success:', data);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        toast.success('Alan öğretmeni başarıyla güncellendi!');
        setIsModalOpen(false);
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

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: (data, teacherId) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        toast.success('Alan öğretmeni başarıyla silindi!');
      } else {
         toast.error(`Öğretmen silinemedi: ${data.error}`);
      }
    },
    onError: (err, teacherId) => {
       toast.error(`Öğretmen silinemedi: ${err instanceof Error ? err.message : String(err)}`);
       console.error(`Delete teacher error (ID: ${teacherId}):`, err);
    },
  });

  const handleAdd = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = (teacherId: string) => {
    if (window.confirm('Bu öğretmeni silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(teacherId);
    }
  };

  const handleFormSubmit = (data: TeacherFormValues) => {
    console.log('[Page] handleFormSubmit called with data:', data);
    if (editingTeacher?.id) {
       console.log('[Page] Attempting to update teacher:', editingTeacher.id);
       updateMutation.mutate({ id: editingTeacher.id, payload: { ...editingTeacher, ...data } });
    } else {
       console.log('[Page] Attempting to create teacher');
       createMutation.mutate(data);
    }
  };

  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Alan Öğretmenleri</h1>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Öğretmen Ekle
        </button>
      </div>

      {isLoading && <p>Öğretmenler yükleniyor...</p>}
      {error && <p className="text-red-600">Öğretmenler yüklenirken bir hata oluştu: {error.message}</p>}

      {!isLoading && !error && (
        <AreaTeachersTable teachers={teachers} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {isModalOpen && (
        <AreaTeacherFormModal
          initialData={editingTeacher ?? undefined}
          onSubmit={handleFormSubmit}
          onClose={() => setIsModalOpen(false)}
          loading={mutationLoading}
        />
      )}
    </div>
  );
} 