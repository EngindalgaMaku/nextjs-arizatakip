export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      branches: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string | null
          business_type: string
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          semester_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_type: string
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          semester_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          semester_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          branch_id: string | null
          class_president_name: string | null
          class_teacher_id: string | null
          created_at: string
          custom_teacher_name: string | null
          dal_id: string | null
          display_order: number
          grade_level: number | null
          id: string
          name: string
          semester_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          class_president_name?: string | null
          class_teacher_id?: string | null
          created_at?: string
          custom_teacher_name?: string | null
          dal_id?: string | null
          display_order: number
          grade_level?: number | null
          id?: string
          name: string
          semester_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          class_president_name?: string | null
          class_teacher_id?: string | null
          created_at?: string
          custom_teacher_name?: string | null
          dal_id?: string | null
          display_order?: number
          grade_level?: number | null
          id?: string
          name?: string
          semester_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_classes_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_classes_dal"
            columns: ["dal_id"]
            isOneToOne: false
            referencedRelation: "dallar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_classes_semester"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      computers: {
        Row: {
          id: number
          lab_id: number | null
          name: string
        }
        Insert: {
          id?: number
          lab_id?: number | null
          name: string
        }
        Update: {
          id?: number
          lab_id?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "computers_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      dal_ders_lab_types: {
        Row: {
          dal_ders_id: string
          lab_type_id: string
        }
        Insert: {
          dal_ders_id: string
          lab_type_id: string
        }
        Update: {
          dal_ders_id?: string
          lab_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dal_ders_lab_types_dal_ders_id_fkey"
            columns: ["dal_ders_id"]
            isOneToOne: false
            referencedRelation: "dal_dersleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dal_ders_lab_types_lab_type_id_fkey"
            columns: ["lab_type_id"]
            isOneToOne: false
            referencedRelation: "lab_types"
            referencedColumns: ["id"]
          },
        ]
      }
      dal_dersleri: {
        Row: {
          bolunebilir_mi: boolean
          cizelgeye_dahil_et: boolean | null
          created_at: string
          dal_id: string
          ders_adi: string
          haftalik_saat: number
          id: string
          requires_multiple_resources: boolean
          sinif_seviyesi: number
          updated_at: string
        }
        Insert: {
          bolunebilir_mi?: boolean
          cizelgeye_dahil_et?: boolean | null
          created_at?: string
          dal_id: string
          ders_adi: string
          haftalik_saat: number
          id?: string
          requires_multiple_resources?: boolean
          sinif_seviyesi: number
          updated_at?: string
        }
        Update: {
          bolunebilir_mi?: boolean
          cizelgeye_dahil_et?: boolean | null
          created_at?: string
          dal_id?: string
          ders_adi?: string
          haftalik_saat?: number
          id?: string
          requires_multiple_resources?: boolean
          sinif_seviyesi?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dal_dersleri_dal_id_fkey"
            columns: ["dal_id"]
            isOneToOne: false
            referencedRelation: "dallar"
            referencedColumns: ["id"]
          },
        ]
      }
      dallar: {
        Row: {
          branch_id: string
          created_at: string
          description: string | null
          grade_12_days: string[] | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          description?: string | null
          grade_12_days?: string[] | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          description?: string | null
          grade_12_days?: string[] | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dallar_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          barcode_value: string | null
          created_at: string
          department: string | null
          id: string
          issues: Json
          location_id: string | null
          name: string
          notes: string | null
          properties: Json | null
          purchase_date: string | null
          serial_number: string | null
          sort_order: number | null
          status: string | null
          type: string
          updated_at: string
          warranty_expiry_date: string | null
        }
        Insert: {
          barcode_value?: string | null
          created_at?: string
          department?: string | null
          id?: string
          issues?: Json
          location_id?: string | null
          name: string
          notes?: string | null
          properties?: Json | null
          purchase_date?: string | null
          serial_number?: string | null
          sort_order?: number | null
          status?: string | null
          type: string
          updated_at?: string
          warranty_expiry_date?: string | null
        }
        Update: {
          barcode_value?: string | null
          created_at?: string
          department?: string | null
          id?: string
          issues?: Json
          location_id?: string | null
          name?: string
          notes?: string | null
          properties?: Json | null
          purchase_date?: string | null
          serial_number?: string | null
          sort_order?: number | null
          status?: string | null
          type?: string
          updated_at?: string
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices_sort_backup: {
        Row: {
          id: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      faults: {
        Row: {
          aciklama: string | null
          cihaz_tipi: string | null
          computer_id: number | null
          durum: string | null
          id: number
          kat: string | null
          lab_id: number | null
          note: string | null
          ogretmen_email: string | null
          sinif: string | null
          tarih: string | null
        }
        Insert: {
          aciklama?: string | null
          cihaz_tipi?: string | null
          computer_id?: number | null
          durum?: string | null
          id?: number
          kat?: string | null
          lab_id?: number | null
          note?: string | null
          ogretmen_email?: string | null
          sinif?: string | null
          tarih?: string | null
        }
        Update: {
          aciklama?: string | null
          cihaz_tipi?: string | null
          computer_id?: number | null
          durum?: string | null
          id?: number
          kat?: string | null
          lab_id?: number | null
          note?: string | null
          ogretmen_email?: string | null
          sinif?: string | null
          tarih?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faults_computer_id_fkey"
            columns: ["computer_id"]
            isOneToOne: false
            referencedRelation: "computers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faults_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faults_ogretmen_email_fkey"
            columns: ["ogretmen_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          display_order: number
          field_type: string
          form_id: string
          id: string
          is_required: boolean
          label: string
          options: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order: number
          field_type?: string
          form_id: string
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          form_id: string
          id: string
          response_data: Json
          submitted_at: string
        }
        Insert: {
          form_id: string
          id?: string
          response_data: Json
          submitted_at?: string
        }
        Update: {
          form_id?: string
          id?: string
          response_data?: Json
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          data: Json
          form_id: string
          id: string
          submitted_at: string
        }
        Insert: {
          data: Json
          form_id: string
          id?: string
          submitted_at?: string
        }
        Update: {
          data?: Json
          form_id?: string
          id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      issues: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string
          device_location: string
          device_name: string
          device_type: string
          id: string
          notes: string | null
          priority: string
          reported_by: string
          resolved_at: string | null
          room_number: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description: string
          device_location: string
          device_name: string
          device_type: string
          id?: string
          notes?: string | null
          priority: string
          reported_by: string
          resolved_at?: string | null
          room_number?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          device_location?: string
          device_name?: string
          device_type?: string
          id?: string
          notes?: string | null
          priority?: string
          reported_by?: string
          resolved_at?: string | null
          room_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lab_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      labs: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      live_exam_attempts: {
        Row: {
          answers: Json | null
          created_at: string
          current_question: number | null
          end_time: string | null
          id: string
          last_active: string | null
          live_exam_id: string
          progress: number | null
          start_time: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          current_question?: number | null
          end_time?: string | null
          id?: string
          last_active?: string | null
          live_exam_id: string
          progress?: number | null
          start_time?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          current_question?: number | null
          end_time?: string | null
          id?: string
          last_active?: string | null
          live_exam_id?: string
          progress?: number | null
          start_time?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_exam_attempts_live_exam_id_fkey"
            columns: ["live_exam_id"]
            isOneToOne: false
            referencedRelation: "live_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exam_participants: {
        Row: {
          answers: Json | null
          attempt_number: number | null
          created_at: string | null
          end_time: string | null
          id: string
          ip_address: string | null
          is_passed: boolean | null
          last_active: string | null
          live_exam_id: string
          progress: number | null
          score: number | null
          start_time: string | null
          status: string | null
          student_id: string
          submit_time: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          ip_address?: string | null
          is_passed?: boolean | null
          last_active?: string | null
          live_exam_id: string
          progress?: number | null
          score?: number | null
          start_time?: string | null
          status?: string | null
          student_id: string
          submit_time?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          answers?: Json | null
          attempt_number?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          ip_address?: string | null
          is_passed?: boolean | null
          last_active?: string | null
          live_exam_id?: string
          progress?: number | null
          score?: number | null
          start_time?: string | null
          status?: string | null
          student_id?: string
          submit_time?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_exam_participants_live_exam_id_fkey"
            columns: ["live_exam_id"]
            isOneToOne: false
            referencedRelation: "live_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_exam_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exams: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          allow_late_submissions: boolean
          auto_publish_results: boolean
          class_ids: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          max_attempts: number
          randomize_options: boolean
          randomize_questions: boolean
          scheduled_end_time: string
          scheduled_start_time: string
          status: Database["public"]["Enums"]["live_exam_status_enum"]
          student_ids: string[] | null
          test_id: string
          time_limit: number
          title: string
          updated_at: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          allow_late_submissions?: boolean
          auto_publish_results?: boolean
          class_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_attempts?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          scheduled_end_time: string
          scheduled_start_time: string
          status?: Database["public"]["Enums"]["live_exam_status_enum"]
          student_ids?: string[] | null
          test_id: string
          time_limit: number
          title: string
          updated_at?: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          allow_late_submissions?: boolean
          auto_publish_results?: boolean
          class_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_attempts?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          scheduled_end_time?: string
          scheduled_start_time?: string
          status?: Database["public"]["Enums"]["live_exam_status_enum"]
          student_ids?: string[] | null
          test_id?: string
          time_limit?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_exams_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      location_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          barcode_value: string | null
          branch_id: string
          capacity: number | null
          code: string | null
          created_at: string
          department: string | null
          description: string | null
          id: string
          lab_type_id: string | null
          location_type_id: string | null
          name: string
          properties: Json | null
          semester_id: string | null
          sort_order: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          barcode_value?: string | null
          branch_id: string
          capacity?: number | null
          code?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          lab_type_id?: string | null
          location_type_id?: string | null
          name: string
          properties?: Json | null
          semester_id?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          barcode_value?: string | null
          branch_id?: string
          capacity?: number | null
          code?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          lab_type_id?: string | null
          location_type_id?: string | null
          name?: string
          properties?: Json | null
          semester_id?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_locations_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_locations_semester"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_location_type_id_fkey"
            columns: ["location_type_id"]
            isOneToOne: false
            referencedRelation: "location_types"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          business_id: string | null
          file_name_original: string | null
          file_path: string
          id: string
          month: number
          notes: string | null
          staj_isletmesi_id: string | null
          student_id: string
          updated_at: string
          uploaded_at: string
          year: number
        }
        Insert: {
          business_id?: string | null
          file_name_original?: string | null
          file_path: string
          id?: string
          month: number
          notes?: string | null
          staj_isletmesi_id?: string | null
          student_id: string
          updated_at?: string
          uploaded_at?: string
          year: number
        }
        Update: {
          business_id?: string | null
          file_name_original?: string | null
          file_path?: string
          id?: string
          month?: number
          notes?: string | null
          staj_isletmesi_id?: string | null
          student_id?: string
          updated_at?: string
          uploaded_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_receipts_staj_isletmesi"
            columns: ["staj_isletmesi_id"]
            isOneToOne: false
            referencedRelation: "staj_isletmeleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_schedules: {
        Row: {
          created_at: string
          description: string | null
          fitness_score: number
          id: string
          logs: string[] | null
          name: string | null
          schedule_data: Json
          total_gaps: number
          unassigned_lessons: Json | null
          updated_at: string | null
          workload_variance: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          fitness_score: number
          id?: string
          logs?: string[] | null
          name?: string | null
          schedule_data: Json
          total_gaps: number
          unassigned_lessons?: Json | null
          updated_at?: string | null
          workload_variance: number
        }
        Update: {
          created_at?: string
          description?: string | null
          fitness_score?: number
          id?: string
          logs?: string[] | null
          name?: string | null
          schedule_data?: Json
          total_gaps?: number
          unassigned_lessons?: Json | null
          updated_at?: string | null
          workload_variance?: number
        }
        Relationships: []
      }
      schedule_entries: {
        Row: {
          class_id: string | null
          created_at: string
          day: number
          id: string
          lab_id: string
          lesson_id: string | null
          period: number
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          day: number
          id?: string
          lab_id: string
          lesson_id?: string | null
          period: number
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          day?: number
          id?: string
          lab_id?: string
          lesson_id?: string | null
          period?: number
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "dal_dersleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_results: {
        Row: {
          attempt_details: Json | null
          batch_id: string | null
          created_at: string
          fitness_score: number
          id: string
          is_active: boolean | null
          schedule_data: Json
          total_gaps: number
          unassigned_lessons: Json | null
          workload_variance: number
        }
        Insert: {
          attempt_details?: Json | null
          batch_id?: string | null
          created_at?: string
          fitness_score: number
          id?: string
          is_active?: boolean | null
          schedule_data: Json
          total_gaps: number
          unassigned_lessons?: Json | null
          workload_variance: number
        }
        Update: {
          attempt_details?: Json | null
          batch_id?: string | null
          created_at?: string
          fitness_score?: number
          id?: string
          is_active?: boolean | null
          schedule_data?: Json
          total_gaps?: number
          unassigned_lessons?: Json | null
          workload_variance?: number
        }
        Relationships: []
      }
      semesters: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      staj_isletmeleri: {
        Row: {
          created_at: string | null
          id: string
          isletme_tipi: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          isletme_tipi: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          isletme_tipi?: string
          name?: string
        }
        Relationships: []
      }
      student_exam_results: {
        Row: {
          answers: Json | null
          created_at: string | null
          id: string
          live_exam_id: string
          score: number
          started_at: string | null
          student_id: string
          submitted_at: string | null
          test_id: string
          updated_at: string | null
        }
        Insert: {
          answers?: Json | null
          created_at?: string | null
          id?: string
          live_exam_id: string
          score: number
          started_at?: string | null
          student_id: string
          submitted_at?: string | null
          test_id: string
          updated_at?: string | null
        }
        Update: {
          answers?: Json | null
          created_at?: string | null
          id?: string
          live_exam_id?: string
          score?: number
          started_at?: string | null
          student_id?: string
          submitted_at?: string | null
          test_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_exam_results_live_exam_id_fkey"
            columns: ["live_exam_id"]
            isOneToOne: false
            referencedRelation: "live_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string | null
          class_id: string
          created_at: string
          email: string | null
          gender: Database["public"]["Enums"]["student_gender_enum"]
          guardians: Json | null
          id: string
          name: string
          phone: string | null
          school_number: string
          status: Database["public"]["Enums"]["student_status_enum"]
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          class_id: string
          created_at?: string
          email?: string | null
          gender: Database["public"]["Enums"]["student_gender_enum"]
          guardians?: Json | null
          id?: string
          name: string
          phone?: string | null
          school_number: string
          status?: Database["public"]["Enums"]["student_status_enum"]
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          class_id?: string
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["student_gender_enum"]
          guardians?: Json | null
          id?: string
          name?: string
          phone?: string | null
          school_number?: string
          status?: Database["public"]["Enums"]["student_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          created_at: string
          dal_ders_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          dal_ders_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          dal_ders_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_dal_ders_id_fkey"
            columns: ["dal_ders_id"]
            isOneToOne: false
            referencedRelation: "dal_dersleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_course_assignments: {
        Row: {
          assignment: Database["public"]["Enums"]["assignment_type"]
          created_at: string
          dal_ders_id: string
          id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          assignment: Database["public"]["Enums"]["assignment_type"]
          created_at?: string
          dal_ders_id: string
          id?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          assignment?: Database["public"]["Enums"]["assignment_type"]
          created_at?: string
          dal_ders_id?: string
          id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_course_assignments_dal_ders_id_fkey"
            columns: ["dal_ders_id"]
            isOneToOne: false
            referencedRelation: "dal_dersleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_course_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_schedules: {
        Row: {
          class_id: string | null
          class_name: string | null
          created_at: string
          day_of_week: number
          id: string
          location_name: string | null
          teacher_id: string
          time_slot: number
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          location_name?: string | null
          teacher_id: string
          time_slot: number
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          location_name?: string | null
          teacher_id?: string
          time_slot?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_teacher_schedules_class_id"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_unavailability: {
        Row: {
          created_at: string
          day_of_week: number
          end_period: number
          id: string
          reason: string | null
          start_period: number
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_period: number
          id?: string
          reason?: string | null
          start_period: number
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_period?: number
          id?: string
          reason?: string | null
          start_period?: number
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_unavailability_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          birth_date: string | null
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role: string | null
          semester_id: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          role?: string | null
          semester_id?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: string | null
          semester_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_teacher_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_teachers_semester_id"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_public_viewable: boolean | null
          is_published: boolean | null
          passing_score: number | null
          questions: Json
          randomize_options: boolean | null
          randomize_questions: boolean | null
          slug: string
          time_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public_viewable?: boolean | null
          is_published?: boolean | null
          passing_score?: number | null
          questions?: Json
          randomize_options?: boolean | null
          randomize_questions?: boolean | null
          slug: string
          time_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public_viewable?: boolean | null
          is_published?: boolean | null
          passing_score?: number | null
          questions?: Json
          randomize_options?: boolean | null
          randomize_questions?: boolean | null
          slug?: string
          time_limit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_fcm_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          updated_at: string
          user_id: string
          user_role: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          updated_at?: string
          user_id: string
          user_role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          ad: string
          auth_user_id: string | null
          ceptel: string | null
          email: string
          id: number
          sifre: string
          soyad: string
          yetki: string
        }
        Insert: {
          ad: string
          auth_user_id?: string | null
          ceptel?: string | null
          email: string
          id?: number
          sifre: string
          soyad: string
          yetki: string
        }
        Update: {
          ad?: string
          auth_user_id?: string | null
          ceptel?: string | null
          email?: string
          id?: number
          sifre?: string
          soyad?: string
          yetki?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_receipts_display: {
        Row: {
          business_name: string | null
          receipt_file_name_original: string | null
          receipt_file_path: string | null
          receipt_id: string | null
          receipt_month: number | null
          receipt_notes: string | null
          receipt_uploaded_at: string | null
          receipt_year: number | null
          staj_isletmesi_id: string | null
          student_class_name: string | null
          student_id: string | null
          student_name: string | null
          student_school_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_receipts_staj_isletmesi"
            columns: ["staj_isletmesi_id"]
            isOneToOne: false
            referencedRelation: "staj_isletmeleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_receipts_view: {
        Row: {
          business_name: string | null
          file_name_original: string | null
          file_path: string | null
          id: string | null
          month: number | null
          notes: string | null
          staj_isletmesi_id: string | null
          student_class_name: string | null
          student_id: string | null
          student_name: string | null
          student_school_number: string | null
          uploaded_at: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_receipts_staj_isletmesi"
            columns: ["staj_isletmesi_id"]
            isOneToOne: false
            referencedRelation: "staj_isletmeleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decrement_sort_order_device: {
        Args: { deleted_order: number }
        Returns: undefined
      }
      swap_sort_order_device: {
        Args: {
          device1_id: string
          device2_id: string
          order1: number
          order2: number
        }
        Returns: undefined
      }
    }
    Enums: {
      assignment_type: "required" | "preferred" | "excluded"
      live_exam_status_enum:
        | "draft"
        | "scheduled"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      student_gender_enum: "male" | "female" | "other"
      student_status_enum: "active" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      assignment_type: ["required", "preferred", "excluded"],
      live_exam_status_enum: [
        "draft",
        "scheduled",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      student_gender_enum: ["male", "female", "other"],
      student_status_enum: ["active", "inactive"],
    },
  },
} as const
