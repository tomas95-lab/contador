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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          currency_id: string
          exchange_rate: number
          amount_ars: number
          cae: string | null
          cae_expires_at: string | null
          status: string
          user_id: string
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
          currency_id?: string
          exchange_rate?: number
          amount_ars?: number
          cae?: string | null
          cae_expires_at?: string | null
          status?: string
          user_id: string
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
          currency_id?: string
          exchange_rate?: number
          amount_ars?: number
          cae?: string | null
          cae_expires_at?: string | null
          status?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          id: string
          role: string
          content: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          role: string
          content: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          role?: string
          content?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      risk_alerts: {
        Row: {
          id: string
          user_id: string
          type: string
          severity: string
          title: string
          message: string
          action_label: string | null
          action_url: string | null
          is_read: boolean
          is_resolved: boolean
          metadata: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          severity: string
          title: string
          message: string
          action_label?: string | null
          action_url?: string | null
          is_read?: boolean
          is_resolved?: boolean
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          severity?: string
          title?: string
          message?: string
          action_label?: string | null
          action_url?: string | null
          is_read?: boolean
          is_resolved?: boolean
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      foreign_clients: {
        Row: {
          id: string
          user_id: string
          name: string
          country_code: string
          tax_id: string | null
          address: string | null
          platform: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          country_code: string
          tax_id?: string | null
          address?: string | null
          platform?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          country_code?: string
          tax_id?: string | null
          address?: string | null
          platform?: string | null
          created_at?: string
          updated_at?: string
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
          user_id: string
          category_key: string
          annual_limit: number
          monthly_tax: number
          warning_at: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_key: string
          annual_limit: number
          monthly_tax: number
          warning_at?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_key?: string
          annual_limit?: number
          monthly_tax?: number
          warning_at?: number
          updated_at?: string
        }
        Relationships: []
      }
      tax_categories: {
        Row: {
          category_key: string
          annual_limit: number
          monthly_tax: number
          warning_at: number
          updated_at: string
        }
        Insert: {
          category_key: string
          annual_limit: number
          monthly_tax: number
          warning_at?: number
          updated_at?: string
        }
        Update: {
          category_key?: string
          annual_limit?: number
          monthly_tax?: number
          warning_at?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_arca_credentials: {
        Row: {
          id: string
          user_id: string
          arca_environment: "homologacion" | "production"
          cuit: string
          certificate: string
          private_key: string
          wsfe_pto_vta: number
          wsfex_pto_vta: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          arca_environment?: "homologacion" | "production"
          cuit: string
          certificate: string
          private_key: string
          wsfe_pto_vta?: number
          wsfex_pto_vta?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          arca_environment?: "homologacion" | "production"
          cuit?: string
          certificate?: string
          private_key?: string
          wsfe_pto_vta?: number
          wsfex_pto_vta?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          active: boolean
          created_at: string
          updated_at: string
          last_used_at: string | null
          failed_at: string | null
          failure_reason: string | null
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
          last_used_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
          last_used_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
        }
        Relationships: []
      }
      tax_payments: {
        Row: {
          id: string
          month_key: string
          amount: number
          paid_at: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          month_key: string
          amount: number
          paid_at?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          month_key?: string
          amount?: number
          paid_at?: string
          user_id?: string
          created_at?: string
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
