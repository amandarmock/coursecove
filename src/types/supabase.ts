export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointment_type_instructors: {
        Row: {
          appointment_type_id: string
          created_at: string
          id: string
          instructor_id: string
          organization_id: string
        }
        Insert: {
          appointment_type_id: string
          created_at?: string
          id?: string
          instructor_id: string
          organization_id: string
        }
        Update: {
          appointment_type_id?: string
          created_at?: string
          id?: string
          instructor_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_type_instructors_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_type_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_type_instructors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          business_location_id: string | null
          category: Database["public"]["Enums"]["AppointmentTypeCategory"]
          created_at: string
          deleted_at: string | null
          description: string | null
          duration: number
          id: string
          location_mode: Database["public"]["Enums"]["LocationMode"]
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["AppointmentTypeStatus"]
          updated_at: string
          version: number
        }
        Insert: {
          business_location_id?: string | null
          category?: Database["public"]["Enums"]["AppointmentTypeCategory"]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration: number
          id?: string
          location_mode?: Database["public"]["Enums"]["LocationMode"]
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["AppointmentTypeStatus"]
          updated_at?: string
          version?: number
        }
        Update: {
          business_location_id?: string | null
          category?: Database["public"]["Enums"]["AppointmentTypeCategory"]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          location_mode?: Database["public"]["Enums"]["LocationMode"]
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["AppointmentTypeStatus"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_business_location_id_fkey"
            columns: ["business_location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          duration: number
          id: string
          instructor_id: string
          is_online: boolean
          location_address: string | null
          notes: string | null
          organization_id: string
          status: Database["public"]["Enums"]["AppointmentStatus"]
          student_id: string
          title: string
          updated_at: string
          version: number
          video_link: string | null
        }
        Insert: {
          appointment_type_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          duration: number
          id?: string
          instructor_id: string
          is_online: boolean
          location_address?: string | null
          notes?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["AppointmentStatus"]
          student_id: string
          title: string
          updated_at?: string
          version?: number
          video_link?: string | null
        }
        Update: {
          appointment_type_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          instructor_id?: string
          is_online?: boolean
          location_address?: string | null
          notes?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["AppointmentStatus"]
          student_id?: string
          title?: string
          updated_at?: string
          version?: number
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      business_locations: {
        Row: {
          address: string
          city: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          state: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          state: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          state?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_availability: {
        Row: {
          created_at: string
          dayOfWeek: number
          end_time: string
          id: string
          instructor_id: string
          organization_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dayOfWeek: number
          end_time: string
          id?: string
          instructor_id: string
          organization_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dayOfWeek?: number
          end_time?: string
          id?: string
          instructor_id?: string
          organization_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_availability_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_availability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["MembershipRole"]
          status: Database["public"]["Enums"]["InvitationStatus"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["MembershipRole"]
          status?: Database["public"]["Enums"]["InvitationStatus"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["MembershipRole"]
          status?: Database["public"]["Enums"]["InvitationStatus"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          clerk_membership_id: string | null
          created_at: string
          id: string
          organization_id: string
          removed_at: string | null
          removed_by: string | null
          role: Database["public"]["Enums"]["MembershipRole"]
          status: Database["public"]["Enums"]["MembershipStatus"]
          updated_at: string
          user_id: string
        }
        Insert: {
          clerk_membership_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          removed_at?: string | null
          removed_by?: string | null
          role: Database["public"]["Enums"]["MembershipRole"]
          status?: Database["public"]["Enums"]["MembershipStatus"]
          updated_at?: string
          user_id: string
        }
        Update: {
          clerk_membership_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          removed_at?: string | null
          removed_by?: string | null
          role?: Database["public"]["Enums"]["MembershipRole"]
          status?: Database["public"]["Enums"]["MembershipStatus"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          clerk_organization_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          slug: string
          status: Database["public"]["Enums"]["MembershipStatus"]
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          clerk_organization_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          slug: string
          status?: Database["public"]["Enums"]["MembershipStatus"]
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          clerk_organization_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["MembershipStatus"]
          subdomain?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          resource: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          id?: string
          resource: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          resource?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          permission_id: string
          role: Database["public"]["Enums"]["MembershipRole"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          permission_id: string
          role: Database["public"]["Enums"]["MembershipRole"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["MembershipRole"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          clerk_user_id: string
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          status: Database["public"]["Enums"]["MembershipStatus"]
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          clerk_user_id: string
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          status?: Database["public"]["Enums"]["MembershipStatus"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          clerk_user_id?: string
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          status?: Database["public"]["Enums"]["MembershipStatus"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          attempts: number
          created_at: string
          deleted_at: string | null
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          status: string
          updated_at: string
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          deleted_at?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          payload: Json
          processed_at?: string | null
          status?: string
          updated_at?: string
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          deleted_at?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
          updated_at?: string
          webhook_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_rls_context: {
        Args: { p_clerk_user_id: string; p_org_id: string }
        Returns: undefined
      }
    }
    Enums: {
      AppointmentStatus:
        | "UNBOOKED"
        | "BOOKED"
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
      AppointmentTypeCategory: "PRIVATE_LESSON" | "APPOINTMENT"
      AppointmentTypeStatus: "DRAFT" | "PUBLISHED" | "UNPUBLISHED"
      InvitationStatus: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED"
      LocationMode: "BUSINESS_LOCATION" | "ONLINE" | "STUDENT_LOCATION"
      MembershipRole: "SUPER_ADMIN" | "INSTRUCTOR" | "STUDENT" | "GUARDIAN"
      MembershipStatus: "ACTIVE" | "SUSPENDED" | "DELETED" | "REMOVED"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      AppointmentStatus: [
        "UNBOOKED",
        "BOOKED",
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ],
      AppointmentTypeCategory: ["PRIVATE_LESSON", "APPOINTMENT"],
      AppointmentTypeStatus: ["DRAFT", "PUBLISHED", "UNPUBLISHED"],
      InvitationStatus: ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"],
      LocationMode: ["BUSINESS_LOCATION", "ONLINE", "STUDENT_LOCATION"],
      MembershipRole: ["SUPER_ADMIN", "INSTRUCTOR", "STUDENT", "GUARDIAN"],
      MembershipStatus: ["ACTIVE", "SUSPENDED", "DELETED", "REMOVED"],
    },
  },
} as const

