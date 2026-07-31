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
      audit_log: {
        Row: {
          acao: string
          created_at: string
          id: string
          loja_id: string | null
          registro_id: string | null
          tabela: string
          usuario: string | null
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          loja_id?: string | null
          registro_id?: string | null
          tabela: string
          usuario?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          loja_id?: string | null
          registro_id?: string | null
          tabela?: string
          usuario?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: []
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
          status_manual: string
          status_manual_desde: string | null
          status_manual_observacao: string | null
          status_manual_por: string | null
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
          status_manual?: string
          status_manual_desde?: string | null
          status_manual_observacao?: string | null
          status_manual_por?: string | null
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
          status_manual?: string
          status_manual_desde?: string | null
          status_manual_observacao?: string | null
          status_manual_por?: string | null
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
      cobrancas: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_envio: string | null
          data_pagamento: string | null
          forma_envio: string | null
          id: string
          loja_id: string | null
          observacao: string | null
          ocorrencia_id: string
          pdf_url: string | null
          status: Database["public"]["Enums"]["cobranca_status"]
          updated_at: string
          usuario: string | null
          valor: number
          whatsapp_enviado: boolean
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_envio?: string | null
          data_pagamento?: string | null
          forma_envio?: string | null
          id?: string
          loja_id?: string | null
          observacao?: string | null
          ocorrencia_id: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["cobranca_status"]
          updated_at?: string
          usuario?: string | null
          valor?: number
          whatsapp_enviado?: boolean
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_envio?: string | null
          data_pagamento?: string | null
          forma_envio?: string | null
          id?: string
          loja_id?: string | null
          observacao?: string | null
          ocorrencia_id?: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["cobranca_status"]
          updated_at?: string
          usuario?: string | null
          valor?: number
          whatsapp_enviado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          nome: string
          razao_social: string | null
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          razao_social?: string | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          razao_social?: string | null
        }
        Relationships: []
      }
      ocorrencia_imagens: {
        Row: {
          created_at: string
          id: string
          loja_id: string | null
          ocorrencia_id: string
          ordem: number
          storage_path: string
          thumbnail: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          loja_id?: string | null
          ocorrencia_id: string
          ordem?: number
          storage_path: string
          thumbnail?: string | null
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          loja_id?: string | null
          ocorrencia_id?: string
          ordem?: number
          storage_path?: string
          thumbnail?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_imagens_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencia_imagens_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_produtos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          loja_id: string | null
          ocorrencia_id: string
          produto_id: string | null
          quantidade: number
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          ocorrencia_id: string
          produto_id?: string | null
          quantidade?: number
          valor?: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          ocorrencia_id?: string
          produto_id?: string | null
          quantidade?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_produtos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencia_produtos_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencia_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_status_log: {
        Row: {
          data_hora: string
          id: string
          loja_id: string | null
          observacao: string | null
          ocorrencia_id: string
          status_anterior:
            | Database["public"]["Enums"]["ocorrencia_status"]
            | null
          status_novo: Database["public"]["Enums"]["ocorrencia_status"]
          usuario: string | null
        }
        Insert: {
          data_hora?: string
          id?: string
          loja_id?: string | null
          observacao?: string | null
          ocorrencia_id: string
          status_anterior?:
            | Database["public"]["Enums"]["ocorrencia_status"]
            | null
          status_novo: Database["public"]["Enums"]["ocorrencia_status"]
          usuario?: string | null
        }
        Update: {
          data_hora?: string
          id?: string
          loja_id?: string | null
          observacao?: string | null
          ocorrencia_id?: string
          status_anterior?:
            | Database["public"]["Enums"]["ocorrencia_status"]
            | null
          status_novo?: Database["public"]["Enums"]["ocorrencia_status"]
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_status_log_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencia_status_log_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          cliente_id: string | null
          cliente_recorrente: boolean
          created_at: string
          created_by: string | null
          data_cobranca: string | null
          data_ocorrencia: string
          data_pagamento: string | null
          data_resolucao: string | null
          descricao: string | null
          id: string
          loja_id: string | null
          numero_cartao: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["ocorrencia_origem"]
          prioridade: Database["public"]["Enums"]["ocorrencia_prioridade"]
          produto_principal: string | null
          resolvida: boolean
          responsavel: string | null
          status: Database["public"]["Enums"]["ocorrencia_status"]
          status_data: string
          status_usuario: string | null
          tipo: string
          tipo_ocorrencia: string | null
          updated_at: string
          valor_perdido: number
          valor_recuperado: number
        }
        Insert: {
          cliente_id?: string | null
          cliente_recorrente?: boolean
          created_at?: string
          created_by?: string | null
          data_cobranca?: string | null
          data_ocorrencia?: string
          data_pagamento?: string | null
          data_resolucao?: string | null
          descricao?: string | null
          id?: string
          loja_id?: string | null
          numero_cartao: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["ocorrencia_origem"]
          prioridade?: Database["public"]["Enums"]["ocorrencia_prioridade"]
          produto_principal?: string | null
          resolvida?: boolean
          responsavel?: string | null
          status?: Database["public"]["Enums"]["ocorrencia_status"]
          status_data?: string
          status_usuario?: string | null
          tipo: string
          tipo_ocorrencia?: string | null
          updated_at?: string
          valor_perdido?: number
          valor_recuperado?: number
        }
        Update: {
          cliente_id?: string | null
          cliente_recorrente?: boolean
          created_at?: string
          created_by?: string | null
          data_cobranca?: string | null
          data_ocorrencia?: string
          data_pagamento?: string | null
          data_resolucao?: string | null
          descricao?: string | null
          id?: string
          loja_id?: string | null
          numero_cartao?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["ocorrencia_origem"]
          prioridade?: Database["public"]["Enums"]["ocorrencia_prioridade"]
          produto_principal?: string | null
          resolvida?: boolean
          responsavel?: string | null
          status?: Database["public"]["Enums"]["ocorrencia_status"]
          status_data?: string
          status_usuario?: string | null
          tipo?: string
          tipo_ocorrencia?: string | null
          updated_at?: string
          valor_perdido?: number
          valor_recuperado?: number
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
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
          arquivo_consolidado_gerado_em: string | null
          arquivo_consolidado_nome: string | null
          arquivo_consolidado_path: string | null
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
          arquivo_consolidado_gerado_em?: string | null
          arquivo_consolidado_nome?: string | null
          arquivo_consolidado_path?: string | null
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
          arquivo_consolidado_gerado_em?: string | null
          arquivo_consolidado_nome?: string | null
          arquivo_consolidado_path?: string | null
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
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          id: string
          loja_id: string | null
          nome: string
          sku: string | null
          updated_at: string
          valor_referencia: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          loja_id?: string | null
          nome: string
          sku?: string | null
          updated_at?: string
          valor_referencia?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          loja_id?: string | null
          nome?: string
          sku?: string | null
          updated_at?: string
          valor_referencia?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_loja_id_fkey"
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
      recuperacoes: {
        Row: {
          cobranca_id: string | null
          created_at: string
          data: string
          forma: Database["public"]["Enums"]["recuperacao_forma"]
          id: string
          loja_id: string | null
          observacao: string | null
          ocorrencia_id: string
          usuario: string | null
          valor: number
        }
        Insert: {
          cobranca_id?: string | null
          created_at?: string
          data?: string
          forma?: Database["public"]["Enums"]["recuperacao_forma"]
          id?: string
          loja_id?: string | null
          observacao?: string | null
          ocorrencia_id: string
          usuario?: string | null
          valor?: number
        }
        Update: {
          cobranca_id?: string | null
          created_at?: string
          data?: string
          forma?: Database["public"]["Enums"]["recuperacao_forma"]
          id?: string
          loja_id?: string | null
          observacao?: string | null
          ocorrencia_id?: string
          usuario?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recuperacoes_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
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
      user_lojas: {
        Row: {
          created_at: string
          loja_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          loja_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          loja_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lojas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
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
      admin_set_user_lojas: {
        Args: { _loja_ids: string[]; _user_id: string }
        Returns: undefined
      }
      bootstrap_admin_self: { Args: never; Returns: boolean }
      current_loja_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      user_has_loja: {
        Args: { _loja_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      cobranca_status:
        | "Pendente"
        | "Enviada"
        | "Negociada"
        | "Paga"
        | "Cancelada"
      ocorrencia_origem: "Manual" | "Upload" | "Automática" | "Integração"
      ocorrencia_prioridade: "Baixa" | "Média" | "Alta" | "Crítica"
      ocorrencia_status:
        | "Nova"
        | "Em análise"
        | "Comunicado ao Síndico"
        | "Comunicado ao RH"
        | "Negociação"
        | "Cobrança Enviada"
        | "Pagamento Recebido"
        | "Finalizada"
        | "Arquivada"
      recuperacao_forma:
        | "PIX"
        | "Dinheiro"
        | "Cartão"
        | "Boleto"
        | "Desconto em folha"
        | "Outro"
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
      app_role: ["admin", "manager", "user"],
      cobranca_status: [
        "Pendente",
        "Enviada",
        "Negociada",
        "Paga",
        "Cancelada",
      ],
      ocorrencia_origem: ["Manual", "Upload", "Automática", "Integração"],
      ocorrencia_prioridade: ["Baixa", "Média", "Alta", "Crítica"],
      ocorrencia_status: [
        "Nova",
        "Em análise",
        "Comunicado ao Síndico",
        "Comunicado ao RH",
        "Negociação",
        "Cobrança Enviada",
        "Pagamento Recebido",
        "Finalizada",
        "Arquivada",
      ],
      recuperacao_forma: [
        "PIX",
        "Dinheiro",
        "Cartão",
        "Boleto",
        "Desconto em folha",
        "Outro",
      ],
    },
  },
} as const
