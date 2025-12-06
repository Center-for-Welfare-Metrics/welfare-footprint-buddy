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
      admin_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_metrics_daily_rollup: {
        Row: {
          avg_latency_ms: number | null
          cache_hits: number
          cache_misses: number
          created_at: string | null
          date: string
          estimated_cost_usd: number | null
          hit_rate: number | null
          id: string
          model: string
          operation: string
          p95_latency_ms: number | null
          p99_latency_ms: number | null
          provider: string
          total_requests: number
          total_tokens: number | null
          updated_at: string | null
        }
        Insert: {
          avg_latency_ms?: number | null
          cache_hits?: number
          cache_misses?: number
          created_at?: string | null
          date: string
          estimated_cost_usd?: number | null
          hit_rate?: number | null
          id?: string
          model: string
          operation: string
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          provider: string
          total_requests?: number
          total_tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_latency_ms?: number | null
          cache_hits?: number
          cache_misses?: number
          created_at?: string | null
          date?: string
          estimated_cost_usd?: number | null
          hit_rate?: number | null
          id?: string
          model?: string
          operation?: string
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          provider?: string
          total_requests?: number
          total_tokens?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          content_hash: string
          created_at: string | null
          expires_at: string | null
          hit_count: number | null
          id: string
          last_accessed_at: string | null
          latency_ms: number
          model: string
          prompt_template_id: string
          prompt_version: string
          provider: string
          response_data: Json
          tokens_used: number | null
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          latency_ms: number
          model: string
          prompt_template_id: string
          prompt_version: string
          provider: string
          response_data: Json
          tokens_used?: number | null
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          latency_ms?: number
          model?: string
          prompt_template_id?: string
          prompt_version?: string
          provider?: string
          response_data?: Json
          tokens_used?: number | null
        }
        Relationships: []
      }
      ai_usage_metrics: {
        Row: {
          cache_hit: boolean | null
          cache_key_hash: string | null
          estimated_cost_usd: number | null
          id: string
          latency_ms: number
          model: string
          operation: string
          provider: string
          timestamp: string | null
          tokens_used: number | null
        }
        Insert: {
          cache_hit?: boolean | null
          cache_key_hash?: string | null
          estimated_cost_usd?: number | null
          id?: string
          latency_ms: number
          model: string
          operation: string
          provider: string
          timestamp?: string | null
          tokens_used?: number | null
        }
        Update: {
          cache_hit?: boolean | null
          cache_key_hash?: string | null
          estimated_cost_usd?: number | null
          id?: string
          latency_ms?: number
          model?: string
          operation?: string
          provider?: string
          timestamp?: string | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      anonymous_daily_usage: {
        Row: {
          date: string
          ip_address: string
          last_updated: string | null
          scans_used: number
        }
        Insert: {
          date: string
          ip_address: string
          last_updated?: string | null
          scans_used?: number
        }
        Update: {
          date?: string
          ip_address?: string
          last_updated?: string | null
          scans_used?: number
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string
          hour_timestamp: string
          id: string
          request_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          hour_timestamp: string
          id?: string
          request_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          hour_timestamp?: string
          id?: string
          request_count?: number
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_category: string | null
          product_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_category?: string | null
          product_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_category?: string | null
          product_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scan_usage: {
        Row: {
          additional_scans_purchased: number
          created_at: string
          id: string
          month_year: string
          scans_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_scans_purchased?: number
          created_at?: string
          id?: string
          month_year: string
          scans_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_scans_purchased?: number
          created_at?: string
          id?: string
          month_year?: string
          scans_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          analysis_result: Json | null
          created_at: string
          id: string
          image_url: string | null
          product_name: string | null
          user_id: string
          welfare_category: string | null
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          product_name?: string | null
          user_id: string
          welfare_category?: string | null
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          product_name?: string | null
          user_id?: string
          welfare_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_results: {
        Row: {
          analysis_data: Json
          created_at: string
          expires_at: string | null
          id: string
          share_token: string
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          analysis_data: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          share_token: string
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          analysis_data?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          share_token?: string
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      user_events: {
        Row: {
          event_properties: Json | null
          event_type: string
          id: string
          ip_hash: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_properties?: Json | null
          event_type: string
          id?: string
          ip_hash?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_properties?: Json | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          anonymous_usage: boolean | null
          created_at: string
          ethical_lens: string | null
          id: string
          notifications_enabled: boolean | null
          preferred_language: string | null
          preferred_region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymous_usage?: boolean | null
          created_at?: string
          ethical_lens?: string | null
          id?: string
          notifications_enabled?: boolean | null
          preferred_language?: string | null
          preferred_region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymous_usage?: boolean | null
          created_at?: string
          ethical_lens?: string | null
          id?: string
          notifications_enabled?: boolean | null
          preferred_language?: string | null
          preferred_region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          product_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          product_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
      admin_flush_all_cache: { Args: never; Returns: number }
      admin_invalidate_by_key: { Args: { key: string }; Returns: boolean }
      admin_invalidate_by_model: {
        Args: { model_name: string }
        Returns: number
      }
      admin_invalidate_by_prompt: {
        Args: { template_id: string; version?: string }
        Returns: number
      }
      aggregate_daily_metrics: {
        Args: { target_date?: string }
        Returns: undefined
      }
      cleanup_expired_cache: { Args: never; Returns: number }
      cleanup_expired_shares: { Args: never; Returns: number }
      cleanup_old_metrics: { Args: never; Returns: number }
      delete_old_scans: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
