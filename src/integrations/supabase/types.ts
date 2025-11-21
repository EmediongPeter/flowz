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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string | null
          code: string | null
          name: string
          type: string
          subtype: string | null
          parent_account_id: string | null
          is_system_default: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          code?: string | null
          name: string
          type: string
          subtype?: string | null
          parent_account_id?: string | null
          is_system_default?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          code?: string | null
          name?: string
          type?: string
          subtype?: string | null
          parent_account_id?: string | null
          is_system_default?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      transaction_mappings: {
        Row: {
          id: string
          transaction_type: string
          debit_account_name: string
          credit_account_name: string
          is_system_default: boolean | null
        }
        Insert: {
          id?: string
          transaction_type: string
          debit_account_name: string
          credit_account_name: string
          is_system_default?: boolean | null
        }
        Update: {
          id?: string
          transaction_type?: string
          debit_account_name?: string
          credit_account_name?: string
          is_system_default?: boolean | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string | null
          transaction_date: string
          transaction_type: string
          reference_number: string | null
          description: string | null
          party_name: string | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          transaction_date?: string
          transaction_type: string
          reference_number?: string | null
          description?: string | null
          party_name?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          transaction_date?: string
          transaction_type?: string
          reference_number?: string | null
          description?: string | null
          party_name?: string | null
          status?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      journal_entry_lines: {
        Row: {
          id: string
          journal_entry_id: string | null
          account_id: string
          description: string | null
          debit: number | null
          credit: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          journal_entry_id?: string | null
          account_id: string
          description?: string | null
          debit?: number | null
          credit?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          journal_entry_id?: string | null
          account_id?: string
          description?: string | null
          debit?: number | null
          credit?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          }
        ]
      }
      entries: {
        Row: {
          allowances: number | null
          amount_before_tax: number | null
          amount_paid: number | null
          balance_due: number | null
          bank_account: string | null
          bank_name: string | null
          book_category: Database["public"]["Enums"]["book_category"]
          category: string | null
          created_at: string
          credit_account: string | null
          debit_account: string | null
          deductions: number | null
          description: string
          discount: number | null
          due_date: string | null
          employee_id: string | null
          gross_pay: number | null
          id: string
          ledger_category: string | null
          net_pay: number | null
          notes: string | null
          party_contact: string | null
          party_name: string | null
          party_type: Database["public"]["Enums"]["party_type"] | null
          payment_mode: Database["public"]["Enums"]["payment_mode"] | null
          payment_period: string | null
          payment_reference: string | null
          payment_type: Database["public"]["Enums"]["payment_type"] | null
          product_service_name: string | null
          quantity: number | null
          reference_number: string | null
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allowances?: number | null
          amount_before_tax?: number | null
          amount_paid?: number | null
          balance_due?: number | null
          bank_account?: string | null
          bank_name?: string | null
          book_category: Database["public"]["Enums"]["book_category"]
          category?: string | null
          created_at?: string
          credit_account?: string | null
          debit_account?: string | null
          deductions?: number | null
          description: string
          discount?: number | null
          due_date?: string | null
          employee_id?: string | null
          gross_pay?: number | null
          id?: string
          ledger_category?: string | null
          net_pay?: number | null
          notes?: string | null
          party_contact?: string | null
          party_name?: string | null
          party_type?: Database["public"]["Enums"]["party_type"] | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          payment_period?: string | null
          payment_reference?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          product_service_name?: string | null
          quantity?: number | null
          reference_number?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount: number
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allowances?: number | null
          amount_before_tax?: number | null
          amount_paid?: number | null
          balance_due?: number | null
          bank_account?: string | null
          bank_name?: string | null
          book_category?: Database["public"]["Enums"]["book_category"]
          category?: string | null
          created_at?: string
          credit_account?: string | null
          debit_account?: string | null
          deductions?: number | null
          description?: string
          discount?: number | null
          due_date?: string | null
          employee_id?: string | null
          gross_pay?: number | null
          id?: string
          ledger_category?: string | null
          net_pay?: number | null
          notes?: string | null
          party_contact?: string | null
          party_name?: string | null
          party_type?: Database["public"]["Enums"]["party_type"] | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          payment_period?: string | null
          payment_reference?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          product_service_name?: string | null
          quantity?: number | null
          reference_number?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          bulk_price: number
          created_at: string
          id: string
          product_name: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bulk_price: number
          created_at?: string
          id?: string
          product_name: string
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bulk_price?: number
          created_at?: string
          id?: string
          product_name?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profit_targets: {
        Row: {
          created_at: string
          id: string
          monthly_target: number
          target_month: number
          target_year: number
          updated_at: string
          user_id: string
          yearly_target: number
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_target: number
          target_month: number
          target_year: number
          updated_at?: string
          user_id: string
          yearly_target: number
        }
        Update: {
          created_at?: string
          id?: string
          monthly_target?: number
          target_month?: number
          target_year?: number
          updated_at?: string
          user_id?: string
          yearly_target?: number
        }
        Relationships: []
      }
      risk_findings: {
        Row: {
          created_at: string
          description: string
          finding_type: string
          id: string
          metadata: Json | null
          recommendations: string | null
          related_entry_id: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          finding_type: string
          id?: string
          metadata?: Json | null
          recommendations?: string | null
          related_entry_id?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          finding_type?: string
          id?: string
          metadata?: Json | null
          recommendations?: string | null
          related_entry_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_book_category: {
        Args: { tx_type: Database["public"]["Enums"]["transaction_type"] }
        Returns: Database["public"]["Enums"]["book_category"]
      }
    }
    Enums: {
      book_category:
        | "sales_book"
        | "purchase_book"
        | "sales_return_book"
        | "purchase_return_book"
        | "cash_book"
        | "bank_book"
        | "payroll_book"
        | "general_journal"
        | "petty_cash_book"
        | "bills_receivable_book"
        | "bills_payable_book"
      party_type: "customer" | "supplier" | "employee" | "other"
      payment_mode:
        | "cash"
        | "bank_transfer"
        | "cheque"
        | "pos"
        | "online"
        | "mobile_money"
      payment_type: "cash" | "bank" | "credit"
      transaction_type:
        | "cash_sale"
        | "credit_sale"
        | "cash_purchase"
        | "credit_purchase"
        | "sales_return"
        | "purchase_return"
        | "cash_receipt"
        | "cash_payment"
        | "bank_receipt"
        | "bank_payment"
        | "payroll"
        | "expense"
        | "asset_purchase"
        | "asset_disposal"
        | "loan_received"
        | "loan_payment"
        | "adjustment"
        | "opening_balance"
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
      book_category: [
        "sales_book",
        "purchase_book",
        "sales_return_book",
        "purchase_return_book",
        "cash_book",
        "bank_book",
        "payroll_book",
        "general_journal",
        "petty_cash_book",
        "bills_receivable_book",
        "bills_payable_book",
      ],
      party_type: ["customer", "supplier", "employee", "other"],
      payment_mode: [
        "cash",
        "bank_transfer",
        "cheque",
        "pos",
        "online",
        "mobile_money",
      ],
      payment_type: ["cash", "bank", "credit"],
      transaction_type: [
        "cash_sale",
        "credit_sale",
        "cash_purchase",
        "credit_purchase",
        "sales_return",
        "purchase_return",
        "cash_receipt",
        "cash_payment",
        "bank_receipt",
        "bank_payment",
        "payroll",
        "expense",
        "asset_purchase",
        "asset_disposal",
        "loan_received",
        "loan_payment",
        "adjustment",
        "opening_balance",
      ],
    },
  },
} as const
