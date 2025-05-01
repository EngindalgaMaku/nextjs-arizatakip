'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import { ClassSchema, ClassFormValues } from '@/types/classes';
import type { Teacher } from '@/types/teachers';
import type { Student } from '@/types/students'; // Import Student type
import { useQuery } from '@tanstack/react-query';
import { fetchTeachers } from '@/actions/teacherActions';
import { fetchStudentsByClass } from '@/actions/studentActions'; // Import student fetch action
import { fetchDallar } from '@/actions/dalActions'; // Import fetchDallar
import type { Dal } from '@/types/dallar'; // Import Dal type

interface ClassFormModalProps {
  initialData?: ClassFormValues;
  classId?: string; // Add classId prop, optional
  onSubmit: (data: ClassFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

// Pass classId down
export function ClassFormModal({ initialData, classId, onSubmit, onClose, loading = false }: ClassFormModalProps) {
  const isEditing = !!initialData?.id;

  // Fetch teachers for the dropdown (always needed)
  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery<Teacher[]>({ 
    queryKey: ['teachers'],
    queryFn: fetchTeachers, 
  });

  // Fetch students for the president dropdown *only if editing*
  const { data: students = [], isLoading: isLoadingStudents } = useQuery<Student[], Error>({
    queryKey: ['students', classId], // Query key depends on classId
    queryFn: () => fetchStudentsByClass(classId!), // Fetch only if classId exists
    enabled: !!classId && isEditing, // Only run query if classId is present and we are editing
  });

  // Fetch Dallar for the dropdown
  const { data: dallarList = [], isLoading: isLoadingDallar } = useQuery<Dal[]>({ 
    queryKey: ['dallar'],
    queryFn: fetchDallar,
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<ClassFormValues>({
    resolver: zodResolver(ClassSchema),
    defaultValues: initialData ?? {
      name: '',
      department: '',
      classTeacherId: null, // Default to null for dropdown
      classPresidentName: '', // President name stored as string
    },
  });

  // Combined loading state
  const isBusy = loading || isSubmitting || isLoadingTeachers || (isEditing && isLoadingStudents) || isLoadingDallar;

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Sınıf Düzenle' : 'Yeni Sınıf'}>
       <form onSubmit={handleSubmit((data) => {
          console.log('[ClassFormModal] Data submitted from form:', data);
          // Ensure president name is empty string if not editing, as dropdown won't be rendered
          const finalData = isEditing ? data : { ...data, classPresidentName: '' }; 
          console.log('[ClassFormModal] Final data being passed to onSubmit:', finalData);
          onSubmit(finalData);
        })} 
        className="space-y-4"
      >
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Class Name */}
          <div>
            <label htmlFor="className" className="block text-sm font-medium text-gray-700">Sınıf Adı</label>
            <input id="className" autoFocus type="text" placeholder="10-A, ATP 11-B vb." {...register('name')} aria-invalid={errors.name ? 'true' : 'false'} className={`mt-1 block w-full rounded p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}/>
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>
          {/* Department Dropdown */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">Dal</label>
            <Controller
                name="department"
                control={control}
                render={({ field }) => (
                    <select
                        id="department"
                        {...field}
                        value={field.value ?? ''} // Handle null/undefined
                        onChange={(e) => field.onChange(e.target.value || null)} // Send null if default option selected
                        className={`mt-1 block w-full rounded p-2 border ${errors.department ? 'border-red-500' : 'border-gray-300'}`}
                        disabled={isLoadingDallar} // Disable while loading
                    >
                        <option value="">-- Dal Seçiniz --</option>
                        {dallarList.map((dal) => (
                            <option key={dal.id} value={dal.name}>
                                {dal.name}
                            </option>
                        ))}
                    </select>
                )}
            />
            {isLoadingDallar && <p className="text-sm text-gray-500 mt-1">Dallar yükleniyor...</p>}
            {errors.department && <p className="text-red-600 text-sm">{errors.department.message}</p>}
          </div>
           {/* Class Teacher Dropdown */}
           <div>
            <label htmlFor="classTeacherId" className="block text-sm font-medium text-gray-700">Sınıf Öğretmeni</label>
            <Controller name="classTeacherId" control={control}
               render={({ field }) => (
                 <select id="classTeacherId" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} className={`mt-1 block w-full rounded p-2 border ${errors.classTeacherId ? 'border-red-500' : 'border-gray-300'}`}>
                    <option value="">-- Öğretmen Seçiniz --</option>
                    {teachers.map((teacher) => (<option key={teacher.id} value={teacher.id}>{teacher.name}</option>))} 
                 </select>
               )}
            />
             {isLoadingTeachers && <p className="text-sm text-gray-500">Öğretmenler yükleniyor...</p>}
             {errors.classTeacherId && <p className="text-red-600 text-sm">{errors.classTeacherId.message}</p>}
          </div>

           {/* Class President - Conditional Rendering */}
          <div>
            <label htmlFor="classPresidentName" className="block text-sm font-medium text-gray-700">Sınıf Başkanı</label>
            {isEditing ? (
              // EDITING MODE: Show dropdown
               <Controller
                 name="classPresidentName"
                 control={control}
                 defaultValue={initialData?.classPresidentName || ''} // Set initial value for dropdown
                 render={({ field }) => ( 
                    <select
                      id="classPresidentName"
                      {...field}
                      className={`mt-1 block w-full rounded p-2 border ${errors.classPresidentName ? 'border-red-500' : 'border-gray-300'}`}
                      disabled={isLoadingStudents} // Disable while loading students
                    >
                      <option value="">-- Öğrenci Seçiniz --</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.name}> {/* Use student name as value */}
                          {student.name}
                        </option>
                      ))}
                    </select>
                 )}
               />
            ) : (
              // CREATING MODE: Show disabled text/input
               <input
                  id="classPresidentName"
                  type="text"
                  className="mt-1 block w-full rounded p-2 border border-gray-300 bg-gray-100"
                  value="Sınıfı kaydedince seçilebilir"
                  readOnly // Use readOnly instead of disabled to avoid skipping submission
                  tabIndex={-1} // Remove from tab order
                />
            )}
             {isEditing && isLoadingStudents && <p className="text-sm text-gray-500">Öğrenciler yükleniyor...</p>}
             {errors.classPresidentName && <p className="text-red-600 text-sm">{errors.classPresidentName.message}</p>}
          </div>

        </fieldset>
        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} disabled={isBusy} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            İptal
          </button>
          <button type="submit" disabled={isBusy} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            {isBusy ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
} 