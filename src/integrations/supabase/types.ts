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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      click_points_log: {
        Row: {
          click_date: string
          created_at: string
          id: string
          product_name: string
          user_id: string
        }
        Insert: {
          click_date?: string
          created_at?: string
          id?: string
          product_name: string
          user_id: string
        }
        Update: {
          click_date?: string
          created_at?: string
          id?: string
          product_name?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_name?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_products: {
        Row: {
          affiliate_url: string | null
          annual_fee: number | null
          category: string
          created_at: string
          currency: string | null
          description: string | null
          external_id: string | null
          features: Json | null
          id: string
          image_url: string | null
          interest_rate: number | null
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          name: string
          partner_id: string | null
          provider: string
          source: string | null
          updated_at: string
        }
        Insert: {
          affiliate_url?: string | null
          annual_fee?: number | null
          category: string
          created_at?: string
          currency?: string | null
          description?: string | null
          external_id?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          interest_rate?: number | null
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          name: string
          partner_id?: string | null
          provider: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_url?: string | null
          annual_fee?: number | null
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          external_id?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          interest_rate?: number | null
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          partner_id?: string | null
          provider?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_integrations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mailing_campaigns: {
        Row: {
          audience: string
          created_at: string
          id: string
          message: string
          points_reward: number
          sent_at: string | null
          sent_by: string | null
          subject: string
        }
        Insert: {
          audience?: string
          created_at?: string
          id?: string
          message: string
          points_reward?: number
          sent_at?: string | null
          sent_by?: string | null
          subject: string
        }
        Update: {
          audience?: string
          created_at?: string
          id?: string
          message?: string
          points_reward?: number
          sent_at?: string | null
          sent_by?: string | null
          subject?: string
        }
        Relationships: []
      }
      mailing_clicks: {
        Row: {
          campaign_id: string
          clicked_at: string
          id: string
          points_awarded: number
          user_id: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string
          id?: string
          points_awarded?: number
          user_id: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string
          id?: string
          points_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mailing_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mailing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          created_at: string
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_integrations: {
        Row: {
          api_key: string | null
          api_secret: string | null
          base_url: string | null
          category_api_keys: Json
          category_points: Json
          created_at: string
          description: string | null
          display_name: string
          enabled: boolean
          id: string
          name: string
          task_points: number
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          base_url?: string | null
          category_api_keys?: Json
          category_points?: Json
          created_at?: string
          description?: string | null
          display_name: string
          enabled?: boolean
          id: string
          name: string
          task_points?: number
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          base_url?: string | null
          category_api_keys?: Json
          category_points?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          enabled?: boolean
          id?: string
          name?: string
          task_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_tasks: {
        Row: {
          confirmed_at: string | null
          created_at: string
          external_task_id: string | null
          id: string
          metadata: Json | null
          partner_id: string
          points_awarded: number | null
          product_id: string | null
          status: string
          task_type: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          external_task_id?: string | null
          id?: string
          metadata?: Json | null
          partner_id: string
          points_awarded?: number | null
          product_id?: string | null
          status?: string
          task_type: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          external_task_id?: string | null
          id?: string
          metadata?: Json | null
          partner_id?: string
          points_awarded?: number | null
          product_id?: string | null
          status?: string
          task_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_tasks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tasks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_integrations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tasks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "financial_products"
            referencedColumns: ["id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          product_name: string
          target_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_name: string
          target_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_name?: string
          target_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email_notifications: boolean
          first_name: string | null
          id: string
          last_name: string | null
          name: string | null
          points_threshold: number | null
          postal_code: string | null
          street: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email_notifications?: boolean
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          points_threshold?: number | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email_notifications?: boolean
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          points_threshold?: number | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string
          id: string
          points_spent: number
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_spent: number
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_settings: {
        Row: {
          click_points: number
          id: string
          point_value_pln: number
          purchase_points: number
          updated_at: string
        }
        Insert: {
          click_points?: number
          id?: string
          point_value_pln?: number
          purchase_points?: number
          updated_at?: string
        }
        Update: {
          click_points?: number
          id?: string
          point_value_pln?: number
          purchase_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          points_cost: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          points_cost: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_cost?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          api_key: string | null
          api_secret: string | null
          color: string
          created_at: string
          enabled: boolean
          id: string
          logo: string
          name: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          color?: string
          created_at?: string
          enabled?: boolean
          id: string
          logo?: string
          name: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          color?: string
          created_at?: string
          enabled?: boolean
          id?: string
          logo?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          balance: number
          id: string
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      leaderboard: {
        Row: {
          avatar_url: string | null
          balance: number | null
          name: string | null
          rank: number | null
          total_earned: number | null
        }
        Relationships: []
      }
      partner_integrations_public: {
        Row: {
          category_points: Json | null
          description: string | null
          display_name: string | null
          enabled: boolean | null
          id: string | null
          name: string | null
          task_points: number | null
        }
        Insert: {
          category_points?: Json | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          id?: string | null
          name?: string | null
          task_points?: number | null
        }
        Update: {
          category_points?: Json | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          id?: string | null
          name?: string | null
          task_points?: number | null
        }
        Relationships: []
      }
      stores_public: {
        Row: {
          color: string | null
          enabled: boolean | null
          id: string | null
          logo: string | null
          name: string | null
        }
        Insert: {
          color?: string | null
          enabled?: boolean | null
          id?: string | null
          logo?: string | null
          name?: string | null
        }
        Update: {
          color?: string | null
          enabled?: boolean | null
          id?: string | null
          logo?: string | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_add_points: {
        Args: { _amount: number; _description: string; _user_id: string }
        Returns: Json
      }
      award_click_points: {
        Args: { _product_name: string; _user_id: string }
        Returns: Json
      }
      award_mailing_click_points: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: Json
      }
      award_partner_task_points:
        | {
            Args: {
              _external_task_id: string
              _partner_id: string
              _product_id?: string
              _task_type: string
              _user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _external_task_id: string
              _override_points?: number
              _partner_id: string
              _product_id?: string
              _task_type: string
              _user_id: string
            }
            Returns: Json
          }
      award_purchase_points: {
        Args: { _product_name: string; _store_name: string; _user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_reward: {
        Args: { _reward_id: string; _user_id: string }
        Returns: Json
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
