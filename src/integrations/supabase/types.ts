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
      alertas: {
        Row: {
          cliente_id: string | null
          created_at: string
          descricao: string | null
          gravidade: string
          id: string
          loja_id: string | null
          status: string
          tipo: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          descricao?: string | null
          gravidade?: string
          id?: string
          loja_id?: string | null
          status?: string
          tipo: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          descricao?: string | null
          gravidade?: string
          id?: string
          loja_id?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          id: string
          is_trusted: boolean
          loja_id: string | null
          numero_cartao: string
          ocorrencias: number
          rating_final: string
          score_confianca: number
          total_compras: number
          total_gasto: number
          ultima_compra: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_trusted?: boolean
          loja_id?: string | null
          numero_cartao: string
          ocorrencias?: number
          rating_final?: string
          score_confianca?: number
          total_compras?: number
          total_gasto?: number
          ultima_compra?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_trusted?: boolean
          loja_id?: string | null
          numero_cartao?: string
          ocorrencias?: number
          rating_final?: string
          score_confianca?: number
          total_compras?: number
          total_gasto?: number
          ultima_compra?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          created_at: string
          endereco: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      ocorrencias: {
        Row: {
          created_at: string
          created_by: string | null
          data_ocorrencia: string
          descricao: string | null
          id: string
          loja_id: string | null
          numero_cartao: string
          resolvida: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_ocorrencia?: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          numero_cartao: string
          resolvida?: boolean
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_ocorrencia?: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          numero_cartao?: string
          resolvida?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      processamentos: {
        Row: {
          arquivo_diaria: string | null
          arquivo_historico: string | null
          clientes_red: number | null
          clientes_trusted: number | null
          created_at: string
          created_by: string | null
          data_referencia: string
          erro_mensagem: string | null
          faturamento_total: number | null
          id: string
          loja_id: string | null
          status: string
          threshold_diamond: number | null
          threshold_gold: number | null
          total_transacoes: number | null
          updated_at: string
        }
        Insert: {
          arquivo_diaria?: string | null
          arquivo_historico?: string | null
          clientes_red?: number | null
          clientes_trusted?: number | null
          created_at?: string
          created_by?: string | null
          data_referencia?: string
          erro_mensagem?: string | null
          faturamento_total?: number | null
          id?: string
          loja_id?: string | null
          status?: string
          threshold_diamond?: number | null
          threshold_gold?: number | null
          total_transacoes?: number | null
          updated_at?: string
        }
        Update: {
          arquivo_diaria?: string | null
          arquivo_historico?: string | null
          clientes_red?: number | null
          clientes_trusted?: number | null
          created_at?: string
          created_by?: string | null
          data_referencia?: string
          erro_mensagem?: string | null
          faturamento_total?: number | null
          id?: string
          loja_id?: string | null
          status?: string
          threshold_diamond?: number | null
          threshold_gold?: number | null
          total_transacoes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          loja_id: string | null
          nome: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          loja_id?: string | null
          nome?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          loja_id?: string | null
          nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_logs: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          motivo: string | null
          rating_anterior: string | null
          rating_novo: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          rating_anterior?: string | null
          rating_novo?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          rating_anterior?: string | null
          rating_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rating_logs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_transacao: string
          id: string
          loja_id: string | null
          numero_cartao: string | null
          status: string | null
          valor: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_transacao?: string
          id?: string
          loja_id?: string | null
          numero_cartao?: string | null
          status?: string | null
          valor?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_transacao?: string
          id?: string
          loja_id?: string | null
          numero_cartao?: string | null
          status?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
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
    Enums: {},
  },
} as const
