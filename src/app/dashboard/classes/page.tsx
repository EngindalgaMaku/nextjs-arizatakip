'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClasses, createClass, updateClass, deleteClass } from '@/actions/classActions';
import { fetchTeachers } from '@/actions/teacherActions'; // To build teacher map
import { Class, ClassFormValues } from '@/types/classes';
import { Teacher } from '@/types/teachers';
import { ClassesTable } from '@/components/classes/ClassesTable';
import { ClassFormModal } from '@/components/classes/ClassFormModal';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function ClassesPage() {
  const queryClient = useQueryClient();

  // Fetch Classes
  const { data: classes = [], isLoading: isLoadingClasses, error: errorClasses } = useQuery<Class[], Error>({
    queryKey: ['classes'],
    queryFn: fetchClasses,
  });

  // Fetch Teachers (needed for display in table)
  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery<Teacher[], Error>({
    queryKey: ['teachers'],
    queryFn: fetchTeachers,
  });

  // Create a map for quick teacher name lookup
  const teachersMap = React.useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach(teacher => map.set(teacher.id, teacher.name));
    return map;
  }, [teachers]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: ClassFormValues) => createClass(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
    onError: (error) => {
      console.error("Error creating class:", error);
      // TODO: Add user notification (e.g., toast)
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClassFormValues }) => updateClass(id, payload),
    onSuccess: () => {
      console.log('Class updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
     onError: (error, variables) => {
      console.error("--- UPDATE CLASS MUTATION ERROR ---");
      console.error("Error:", error);
      console.error("Variables passed to mutationFn:", variables); 
      // TODO: Add user notification
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
     onError: (error) => {
      console.error("Error deleting class:", error);
      // TODO: Add user notification
    },
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<ClassFormValues | null>(null);

  const handleAdd = () => {
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cls: Class) => {
    // Prepare initialData for the form (ensure teacher ID is correct format)
    const initialData: ClassFormValues = {
        ...cls,
        classTeacherId: cls.classTeacherId ?? null, // Ensure null if undefined/empty
    };
    setEditingClass(initialData);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu sınıfı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
       deleteMutation.mutate(id);
    }
  };

  const handleFormSubmit = (data: ClassFormValues) => {
    const mutationPayload = { ...data, classTeacherId: data.classTeacherId || null }; // Ensure null is sent if empty

    if (editingClass?.id) {
       // --- DEBUG LOGS --- 
      console.log(`Attempting to update class with ID: ${editingClass.id}`);
      console.log("Payload prepared for mutation:", mutationPayload);
      // --- END DEBUG LOGS --- 
      updateMutation.mutate({ id: editingClass.id, payload: mutationPayload });
    } else {
      // --- DEBUG LOGS --- 
      console.log("Attempting to create class with payload:", mutationPayload);
      // --- END DEBUG LOGS --- 
      createMutation.mutate(mutationPayload);
    }
    setIsModalOpen(false);
  };

  const isLoading = isLoadingClasses || isLoadingTeachers;
  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const error = errorClasses; // Can combine errors later if needed

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sınıflar</h1>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Sınıf Ekle
        </button>
      </div>

      {isLoading && <div>Yükleniyor...</div>}
      {error && <div className="text-red-600">Hata: {error.message}</div>}
      {!isLoading && !error && (
        <ClassesTable
          classes={classes} // Pass fetched classes
          teachersMap={teachersMap} // Pass teacher map
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {isModalOpen && (
        <ClassFormModal
          initialData={editingClass ?? undefined}
          classId={editingClass?.id}
          onSubmit={handleFormSubmit}
          onClose={() => setIsModalOpen(false)}
          loading={mutationLoading}
        />
      )}
    </div>
  );
} 