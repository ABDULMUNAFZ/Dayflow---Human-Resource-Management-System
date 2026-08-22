export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          status: string
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          status?: string
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          status?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          prefix: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          prefix: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          prefix?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          employee_id: string
          file_url: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          employee_id: string
          file_url?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          employee_id?: string
          file_url?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          avatar_url: string | null
          company_id: string | null
          company: string | null
          needs_password_change: boolean
          created_at: string
          department_id: string | null
          email: string
          employee_code: string
          employment_status: string
          full_name: string
          id: string
          job_title: string
          joining_date: string
          manager_id: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company_id?: string | null
          company?: string | null
          needs_password_change?: boolean
          created_at?: string
          department_id?: string | null
          email: string
          employee_code: string
          employment_status?: string
          full_name: string
          id?: string
          job_title?: string
          joining_date?: string
          manager_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company_id?: string | null
          company?: string | null
          needs_password_change?: boolean
          created_at?: string
          department_id?: string | null
          email?: string
          employee_code?: string
          employment_status?: string
          full_name?: string
          id?: string
          job_title?: string
          joining_date?: string
          manager_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          remarks: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          remarks?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          remarks?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          annual_allowance: number
          created_at: string
          id: string
          name: string
        }
        Insert: {
          annual_allowance?: number
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          annual_allowance?: number
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          allowances: number
          base_salary: number
          created_at: string
          deductions: number
          employee_id: string
          id: string
          net_salary: number | null
          pay_date: string | null
          period: string
          status: string
        }
        Insert: {
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          employee_id: string
          id?: string
          net_salary?: number | null
          pay_date?: string | null
          period: string
          status?: string
        }
        Update: {
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          employee_id?: string
          id?: string
          net_salary?: number | null
          pay_date?: string | null
          period?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_history: {
        Row: {
          allowances: number
          base_salary: number
          changed_by: string | null
          created_at: string
          deductions: number
          effective_from: string
          employee_id: string
          id: string
        }
        Insert: {
          allowances?: number
          base_salary: number
          changed_by?: string | null
          created_at?: string
          deductions?: number
          effective_from?: string
          employee_id: string
          id?: string
        }
        Update: {
          allowances?: number
          base_salary?: number
          changed_by?: string | null
          created_at?: string
          deductions?: number
          effective_from?: string
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _entity: string
          _entity_id: string
          _metadata?: Json
        }
        Returns: string
      }
      notify: {
        Args: {
          _employee_id: string
          _message: string
          _title: string
          _type?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "hr" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "hr", "employee"],
    },
  },
} as const
