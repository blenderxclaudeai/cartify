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
      affiliate_merchants: {
        Row: {
          affiliate_link_template: string | null
          commission_rate: number | null
          created_at: string
          domain: string
          id: string
          network: string | null
          updated_at: string
        }
        Insert: {
          affiliate_link_template?: string | null
          commission_rate?: number | null
          created_at?: string
          domain: string
          id?: string
          network?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_link_template?: string | null
          commission_rate?: number | null
          created_at?: string
          domain?: string
          id?: string
          network?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      click_events: {
        Row: {
          click_ref: string | null
          created_at: string
          id: string
          retailer_domain: string | null
          target_url: string
          user_id: string | null
        }
        Insert: {
          click_ref?: string | null
          created_at?: string
          id?: string
          retailer_domain?: string | null
          target_url: string
          user_id?: string | null
        }
        Update: {
          click_ref?: string | null
          created_at?: string
          id?: string
          retailer_domain?: string | null
          target_url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profile_photos: {
        Row: {
          category: Database["public"]["Enums"]["photo_category"]
          created_at: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["photo_category"]
          created_at?: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["photo_category"]
          created_at?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retailer_coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: string | null
          domain: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          min_purchase: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: string | null
          domain: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          min_purchase?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: string | null
          domain?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          min_purchase?: string | null
        }
        Relationships: []
      }
      session_items: {
        Row: {
          created_at: string
          id: string
          in_cart: boolean
          interaction_type: string
          product_image: string | null
          product_price: string | null
          product_title: string | null
          product_url: string
          retailer_domain: string | null
          session_id: string
          tryon_request_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          in_cart?: boolean
          interaction_type?: string
          product_image?: string | null
          product_price?: string | null
          product_title?: string | null
          product_url: string
          retailer_domain?: string | null
          session_id: string
          tryon_request_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          in_cart?: boolean
          interaction_type?: string
          product_image?: string | null
          product_price?: string | null
          product_title?: string | null
          product_url?: string
          retailer_domain?: string | null
          session_id?: string
          tryon_request_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "shopping_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_items_tryon_request_id_fkey"
            columns: ["tryon_request_id"]
            isOneToOne: false
            referencedRelation: "tryon_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_sessions: {
        Row: {
          expires_at: string
          id: string
          is_active: boolean
          started_at: string
          user_id: string
        }
        Insert: {
          expires_at?: string
          id?: string
          is_active?: boolean
          started_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          is_active?: boolean
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tryon_requests: {
        Row: {
          created_at: string
          id: string
          image_url: string
          page_url: string
          price: string | null
          result_image_url: string | null
          retailer_domain: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          page_url: string
          price?: string | null
          result_image_url?: string | null
          retailer_domain?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          page_url?: string
          price?: string | null
          result_image_url?: string | null
          retailer_domain?: string | null
          status?: string
          title?: string | null
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
      wallet_ledger: {
        Row: {
          amount: number
          click_event_id: string | null
          created_at: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["wallet_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          click_event_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          click_event_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_click_event_id_fkey"
            columns: ["click_event_id"]
            isOneToOne: false
            referencedRelation: "click_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_old_tryons: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      photo_category:
        | "full_body"
        | "face"
        | "upper_body"
        | "lifestyle"
        | "hands"
        | "fingers"
        | "nails"
        | "hair"
        | "ears"
        | "living_room"
        | "kitchen"
        | "bedroom"
        | "bathroom"
        | "office"
        | "dog"
        | "cat"
        | "car_interior"
        | "car_exterior"
        | "patio"
        | "garden"
        | "balcony"
        | "lower_body"
        | "feet"
        | "eyes"
        | "lips"
        | "brows"
        | "arms"
        | "back"
        | "lower_back"
        | "head"
      wallet_status: "pending" | "available" | "paid"
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
      app_role: ["admin", "user"],
      photo_category: [
        "full_body",
        "face",
        "upper_body",
        "lifestyle",
        "hands",
        "fingers",
        "nails",
        "hair",
        "ears",
        "living_room",
        "kitchen",
        "bedroom",
        "bathroom",
        "office",
        "dog",
        "cat",
        "car_interior",
        "car_exterior",
        "patio",
        "garden",
        "balcony",
        "lower_body",
        "feet",
        "eyes",
        "lips",
        "brows",
        "arms",
        "back",
        "lower_back",
        "head",
      ],
      wallet_status: ["pending", "available", "paid"],
    },
  },
} as const
