export type Database = {
  public: {
    Tables: {
      payments: {
        Row: {
          id: string
          date: string
          amount: number
          client: string
          description: string
          method: string
          invoice_status: string
          source: string
          invoice_type: string | null
          point_of_sale: number | null
          cae: string | null
          receiver_cuit: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          amount: number
          client: string
          description: string
          method: string
          invoice_status?: string
          source?: string
          invoice_type?: string | null
          point_of_sale?: number | null
          cae?: string | null
          receiver_cuit?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          amount?: number
          client?: string
          description?: string
          method?: string
          invoice_status?: string
          source?: string
          invoice_type?: string | null
          point_of_sale?: number | null
          cae?: string | null
          receiver_cuit?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          payment_id: string | null
          number: string
          invoice_type: string
          point_of_sale: number
          issue_date: string
          client: string
          description: string
          amount: number
          cae: string | null
          cae_expires_at: string | null
          status: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payment_id?: string | null
          number: string
          invoice_type?: string
          point_of_sale?: number
          issue_date: string
          client: string
          description: string
          amount: number
          cae?: string | null
          cae_expires_at?: string | null
          status?: string
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string | null
          number?: string
          invoice_type?: string
          point_of_sale?: number
          issue_date?: string
          client?: string
          description?: string
          amount?: number
          cae?: string | null
          cae_expires_at?: string | null
          status?: string
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          id: string
          role: string
          content: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          role: string
          content: string
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: string
          content?: string
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_fiscal_profiles: {
        Row: {
          user_id: string
          activity: string
          work_status: string
          current_category: string
          expected_monthly_income: number | null
          notes: string
          updated_at: string
        }
        Insert: {
          user_id: string
          activity?: string
          work_status?: string
          current_category?: string
          expected_monthly_income?: number | null
          notes?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          activity?: string
          work_status?: string
          current_category?: string
          expected_monthly_income?: number | null
          notes?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_settings: {
        Row: {
          id: string
          category_key: string
          annual_limit: number
          monthly_tax: number
          warning_at: number
          updated_at: string
        }
        Insert: {
          id?: string
          category_key: string
          annual_limit: number
          monthly_tax: number
          warning_at?: number
          updated_at?: string
        }
        Update: {
          id?: string
          category_key?: string
          annual_limit?: number
          monthly_tax?: number
          warning_at?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
