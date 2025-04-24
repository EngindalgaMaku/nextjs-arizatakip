export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string | null
          role: string | null
          name: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string | null
          role?: string | null
          name?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string | null
          role?: string | null
          name?: string | null
        }
        Relationships: []
      }
      // Diğer tablolar burada tanımlanabilir
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 