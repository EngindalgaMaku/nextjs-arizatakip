"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentBySchoolNumber } from '@/lib/supabase';

interface LoginFormData {
  schoolNumber: string;
  classId: string;
}

interface StudentSession {
  id: string;
  name: string;
  classId: string;
  schoolNumber: string;
}

interface StudentExamLoginFormProps {
  onLoginSuccess: (sessionData: StudentSession) => void;
}

export const StudentExamLoginForm: React.FC<StudentExamLoginFormProps> = ({ onLoginSuccess }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      const student = await getStudentBySchoolNumber(data.schoolNumber);
      
      if (!student) {
        toast.error('Öğrenci bulunamadı');
        return;
      }

      if (student.classId !== data.classId) {
        toast.error('Sınıf bilgisi hatalı');
        return;
      }

      onLoginSuccess({
        id: student.id,
        name: student.name,
        classId: student.classId,
        schoolNumber: student.schoolNumber
      });
      router.push(`/student/exams?studentId=${student.id}`);
    } catch (error) {
      toast.error('Giriş yapılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sınav Girişi</CardTitle>
        <CardDescription>
          Sınava girmek için öğrenci numaranızı ve sınıf bilgilerinizi girin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolNumber">Öğrenci Numarası</Label>
            <Input
              id="schoolNumber"
              type="text"
              {...register('schoolNumber', { required: 'Öğrenci numarası gerekli' })}
            />
            {errors.schoolNumber && (
              <p className="text-sm text-red-500">{errors.schoolNumber.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="classId">Sınıf</Label>
            <Input
              id="classId"
              type="text"
              {...register('classId', { required: 'Sınıf bilgisi gerekli' })}
            />
            {errors.classId && (
              <p className="text-sm text-red-500">{errors.classId.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}; 