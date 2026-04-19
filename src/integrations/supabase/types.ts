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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance_cents: number
          created_at: string
          currency: Database["public"]["Enums"]["account_currency"]
          iban: string | null
          id: string
          is_primary: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["account_currency"]
          iban?: string | null
          id?: string
          is_primary?: boolean
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["account_currency"]
          iban?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crypto_holdings: {
        Row: {
          amount: number
          avg_buy_price_eur: number
          created_at: string
          id: string
          name: string
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          avg_buy_price_eur?: number
          created_at?: string
          id?: string
          name: string
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          avg_buy_price_eur?: number
          created_at?: string
          id?: string
          name?: string
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          address_line: string | null
          city: string | null
          country: string | null
          created_at: string
          document_country: string | null
          document_number: string | null
          document_type: string | null
          id: string
          postal_code: string | null
          reviewed_at: string | null
          selfie_taken: boolean
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          document_country?: string | null
          document_number?: string | null
          document_type?: string | null
          id?: string
          postal_code?: string | null
          reviewed_at?: string | null
          selfie_taken?: boolean
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          document_country?: string | null
          document_number?: string | null
          document_type?: string | null
          id?: string
          postal_code?: string | null
          reviewed_at?: string | null
          selfie_taken?: boolean
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          phone: string | null
          postal_code: string | null
          two_fa_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          postal_code?: string | null
          two_fa_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          postal_code?: string | null
          two_fa_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipients: {
        Row: {
          bank_name: string | null
          country: string | null
          created_at: string
          currency: Database["public"]["Enums"]["account_currency"]
          iban: string | null
          id: string
          is_favorite: boolean
          name: string
          swift_bic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          country?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["account_currency"]
          iban?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          swift_bic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string | null
          country?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["account_currency"]
          iban?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          swift_bic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount_cents: number
          category: string | null
          counterparty_iban: string | null
          counterparty_name: string | null
          counterparty_swift: string | null
          created_at: string
          currency: Database["public"]["Enums"]["account_currency"]
          description: string
          direction: Database["public"]["Enums"]["tx_direction"]
          fee_cents: number
          fx_rate: number | null
          id: string
          network: Database["public"]["Enums"]["transfer_network"] | null
          reference: string | null
          status: Database["public"]["Enums"]["tx_status"]
          user_id: string
        }
        Insert: {
          account_id: string
          amount_cents: number
          category?: string | null
          counterparty_iban?: string | null
          counterparty_name?: string | null
          counterparty_swift?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["account_currency"]
          description: string
          direction: Database["public"]["Enums"]["tx_direction"]
          fee_cents?: number
          fx_rate?: number | null
          id?: string
          network?: Database["public"]["Enums"]["transfer_network"] | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          user_id: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          category?: string | null
          counterparty_iban?: string | null
          counterparty_name?: string | null
          counterparty_swift?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["account_currency"]
          description?: string
          direction?: Database["public"]["Enums"]["tx_direction"]
          fee_cents?: number
          fx_rate?: number | null
          id?: string
          network?: Database["public"]["Enums"]["transfer_network"] | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
    }
    Enums: {
      account_currency: "EUR" | "GBP" | "USD" | "CHF" | "PLN"
      account_type: "current" | "savings" | "crypto"
      app_role: "admin" | "user"
      kyc_status: "not_started" | "pending" | "verified" | "rejected"
      transfer_network: "internal" | "sepa" | "sepa_instant" | "swift"
      tx_direction: "credit" | "debit"
      tx_status: "pending" | "completed" | "failed"
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
      account_currency: ["EUR", "GBP", "USD", "CHF", "PLN"],
      account_type: ["current", "savings", "crypto"],
      app_role: ["admin", "user"],
      kyc_status: ["not_started", "pending", "verified", "rejected"],
      transfer_network: ["internal", "sepa", "sepa_instant", "swift"],
      tx_direction: ["credit", "debit"],
      tx_status: ["pending", "completed", "failed"],
    },
  },
} as const
