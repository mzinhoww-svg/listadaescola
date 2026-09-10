// Gerado a partir do schema real do projeto Supabase `listada-escola`
// (ref wfdejmokxrunupsekcmq) via mcp__Supabase__generate_typescript_types.
// Não editar à mão -- regenerar depois de qualquer migration em
// supabase/migrations/.

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
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          list_id: string | null
          metadata: Json
          partner_id: string | null
          profile_id: string | null
          school_id: string | null
          session_id: string | null
          store_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          list_id?: string | null
          metadata?: Json
          partner_id?: string | null
          profile_id?: string | null
          school_id?: string | null
          session_id?: string | null
          store_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          list_id?: string | null
          metadata?: Json
          partner_id?: string | null
          profile_id?: string | null
          school_id?: string | null
          session_id?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "school_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["campaign_entity_type"]
          id: string
          priority: number
          starts_at: string
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["campaign_entity_type"]
          id?: string
          priority?: number
          starts_at: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["campaign_entity_type"]
          id?: string
          priority?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_partners: {
        Row: {
          created_at: string
          id: string
          integration_type: Database["public"]["Enums"]["ecommerce_integration_type"]
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_type: Database["public"]["Enums"]["ecommerce_integration_type"]
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_type?: Database["public"]["Enums"]["ecommerce_integration_type"]
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      ecommerce_products: {
        Row: {
          created_at: string
          external_url: string
          id: string
          is_active: boolean
          partner_id: string
          price_hint: number | null
          product_id: string
        }
        Insert: {
          created_at?: string
          external_url: string
          id?: string
          is_active?: boolean
          partner_id: string
          price_hint?: number | null
          product_id: string
        }
        Update: {
          created_at?: string
          external_url?: string
          id?: string
          is_active?: boolean
          partner_id?: string
          price_hint?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["favorite_target_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["favorite_target_type"]
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["favorite_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      list_product_mappings: {
        Row: {
          created_at: string
          ecommerce_product_id: string
          id: string
          school_list_item_id: string
        }
        Insert: {
          created_at?: string
          ecommerce_product_id: string
          id?: string
          school_list_item_id: string
        }
        Update: {
          created_at?: string
          ecommerce_product_id?: string
          id?: string
          school_list_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_product_mappings_ecommerce_product_id_fkey"
            columns: ["ecommerce_product_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_product_mappings_school_list_item_id_fkey"
            columns: ["school_list_item_id"]
            isOneToOne: false
            referencedRelation: "school_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      list_submissions: {
        Row: {
          correction_notes: string | null
          created_at: string
          education_level: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          school_year: number
          series_name: string
          status: Database["public"]["Enums"]["submission_status"]
          submitted_by: string
          updated_at: string
        }
        Insert: {
          correction_notes?: string | null
          created_at?: string
          education_level: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          school_year: number
          series_name: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by: string
          updated_at?: string
        }
        Update: {
          correction_notes?: string | null
          created_at?: string
          education_level?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          school_year?: number
          series_name?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_by: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_by: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_by?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          moderated_by: string | null
          profile_id: string
          rating: number
          school_id: string
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          moderated_by?: string | null
          profile_id: string
          rating: number
          school_id: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          moderated_by?: string | null
          profile_id?: string
          rating?: number
          school_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_contacts: {
        Row: {
          contact_type: string
          created_at: string
          id: string
          is_public: boolean
          school_id: string
          value: string
        }
        Insert: {
          contact_type: string
          created_at?: string
          id?: string
          is_public?: boolean
          school_id: string
          value: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          id?: string
          is_public?: boolean
          school_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_contacts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_education_levels: {
        Row: {
          education_level: string
          id: string
          school_id: string
        }
        Insert: {
          education_level: string
          id?: string
          school_id: string
        }
        Update: {
          education_level?: string
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_education_levels_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_images: {
        Row: {
          approved_by: string | null
          caption: string | null
          created_at: string
          id: string
          is_approved: boolean
          school_id: string
          storage_path: string
          submitted_by: string | null
        }
        Insert: {
          approved_by?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          school_id: string
          storage_path: string
          submitted_by?: string | null
        }
        Update: {
          approved_by?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          school_id?: string
          storage_path?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_images_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_images_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_images_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_list_items: {
        Row: {
          brand: string | null
          id: string
          is_required: boolean
          name: string
          notes: string | null
          product_id: string | null
          quantity: number
          school_list_version_id: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          brand?: string | null
          id?: string
          is_required?: boolean
          name: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          school_list_version_id: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          brand?: string | null
          id?: string
          is_required?: boolean
          name?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          school_list_version_id?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_list_items_school_list_version_id_fkey"
            columns: ["school_list_version_id"]
            isOneToOne: false
            referencedRelation: "school_list_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      school_list_versions: {
        Row: {
          id: string
          published_at: string
          published_by: string | null
          school_list_id: string
          status: string
          submission_id: string | null
          version_number: number
        }
        Insert: {
          id?: string
          published_at?: string
          published_by?: string | null
          school_list_id: string
          status?: string
          submission_id?: string | null
          version_number: number
        }
        Update: {
          id?: string
          published_at?: string
          published_by?: string | null
          school_list_id?: string
          status?: string
          submission_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_list_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_list_versions_school_list_id_fkey"
            columns: ["school_list_id"]
            isOneToOne: false
            referencedRelation: "school_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_list_versions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "list_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      school_lists: {
        Row: {
          created_at: string
          education_level: string
          id: string
          school_id: string
          school_year: number
          series_name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          education_level: string
          id?: string
          school_id: string
          school_year: number
          series_name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          education_level?: string
          id?: string
          school_id?: string
          school_year?: number
          series_name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_lists_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_managers: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_managers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_managers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_profiles: {
        Row: {
          created_at: string
          description: string | null
          instagram: string | null
          is_sponsored: boolean
          is_verified: boolean
          logo_url: string | null
          school_id: string
          updated_at: string
          updated_by: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          instagram?: string | null
          is_sponsored?: boolean
          is_verified?: boolean
          logo_url?: string | null
          school_id: string
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          instagram?: string | null
          is_sponsored?: boolean
          is_verified?: boolean
          logo_url?: string | null
          school_id?: string
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_series: {
        Row: {
          created_at: string
          education_level: string
          id: string
          school_id: string
          series_name: string
        }
        Insert: {
          created_at?: string
          education_level: string
          id?: string
          school_id: string
          series_name: string
        }
        Update: {
          created_at?: string
          education_level?: string
          id?: string
          school_id?: string
          series_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_series_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_suggestions: {
        Row: {
          address: string | null
          created_at: string
          id: string
          municipality: string
          name: string
          notes: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_type: Database["public"]["Enums"]["school_type"] | null
          status: Database["public"]["Enums"]["submission_status"]
          suggested_by: string
          uf: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          municipality: string
          name: string
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_type?: Database["public"]["Enums"]["school_type"] | null
          status?: Database["public"]["Enums"]["submission_status"]
          suggested_by: string
          uf: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          municipality?: string
          name?: string
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_type?: Database["public"]["Enums"]["school_type"] | null
          status?: Database["public"]["Enums"]["submission_status"]
          suggested_by?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          administrative_dependency: string | null
          attendance_restriction: string | null
          cep: string | null
          cep_source: string | null
          created_at: string
          differentiated_location: string | null
          education_council_regulation: string | null
          education_offerings: string | null
          id: string
          inep_code: string
          is_active: boolean
          latitude: number | null
          location: unknown
          location_type: Database["public"]["Enums"]["location_type"] | null
          longitude: number | null
          municipality: string
          name: string
          other_education_offerings: string | null
          phone: string | null
          private_school_category: string | null
          public_power_agreement: string | null
          school_size: string | null
          school_type: Database["public"]["Enums"]["school_type"]
          slug: string
          source: string
          uf: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          administrative_dependency?: string | null
          attendance_restriction?: string | null
          cep?: string | null
          cep_source?: string | null
          created_at?: string
          differentiated_location?: string | null
          education_council_regulation?: string | null
          education_offerings?: string | null
          id?: string
          inep_code: string
          is_active?: boolean
          latitude?: number | null
          location?: unknown
          location_type?: Database["public"]["Enums"]["location_type"] | null
          longitude?: number | null
          municipality: string
          name: string
          other_education_offerings?: string | null
          phone?: string | null
          private_school_category?: string | null
          public_power_agreement?: string | null
          school_size?: string | null
          school_type: Database["public"]["Enums"]["school_type"]
          slug: string
          source?: string
          uf: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          administrative_dependency?: string | null
          attendance_restriction?: string | null
          cep?: string | null
          cep_source?: string | null
          created_at?: string
          differentiated_location?: string | null
          education_council_regulation?: string | null
          education_offerings?: string | null
          id?: string
          inep_code?: string
          is_active?: boolean
          latitude?: number | null
          location?: unknown
          location_type?: Database["public"]["Enums"]["location_type"] | null
          longitude?: number | null
          municipality?: string
          name?: string
          other_education_offerings?: string | null
          phone?: string | null
          private_school_category?: string | null
          public_power_agreement?: string | null
          school_size?: string | null
          school_type?: Database["public"]["Enums"]["school_type"]
          slug?: string
          source?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_contacts: {
        Row: {
          contact_type: string
          created_at: string
          id: string
          is_public: boolean
          store_id: string
          value: string
        }
        Insert: {
          contact_type: string
          created_at?: string
          id?: string
          is_public?: boolean
          store_id: string
          value: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          id?: string
          is_public?: boolean
          store_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_contacts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_managers: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_managers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_managers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_services: {
        Row: {
          id: string
          service: string
          store_id: string
        }
        Insert: {
          id?: string
          service: string
          store_id: string
        }
        Update: {
          id?: string
          service?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_services_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          is_sponsored: boolean
          latitude: number | null
          location: unknown
          longitude: number | null
          municipality: string
          name: string
          offers_delivery: boolean
          offers_pickup: boolean
          opening_hours: string | null
          slug: string
          uf: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_sponsored?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          municipality: string
          name: string
          offers_delivery?: boolean
          offers_pickup?: boolean
          opening_hours?: string | null
          slug: string
          uf: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_sponsored?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          municipality?: string
          name?: string
          offers_delivery?: boolean
          offers_pickup?: boolean
          opening_hours?: string | null
          slug?: string
          uf?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      submission_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          submission_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          submission_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          submission_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_attachments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "list_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_items: {
        Row: {
          brand: string | null
          id: string
          is_required: boolean
          name: string
          notes: string | null
          quantity: number
          sort_order: number
          submission_id: string
          unit: string | null
        }
        Insert: {
          brand?: string | null
          id?: string
          is_required?: boolean
          name: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          submission_id: string
          unit?: string | null
        }
        Update: {
          brand?: string | null
          id?: string
          is_required?: boolean
          name?: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          submission_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "list_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_submission: { Args: { p_submission_id: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_school_manager: {
        Args: { target_school_id: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      is_store_manager: { Args: { target_store_id: string }; Returns: boolean }
      reject_submission: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: undefined
      }
      request_submission_correction: {
        Args: { p_notes: string; p_submission_id: string }
        Returns: undefined
      }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      campaign_entity_type: "SCHOOL" | "STORE"
      campaign_status: "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED"
      ecommerce_integration_type: "DEEP_LINK" | "PAGE" | "CART"
      favorite_target_type: "SCHOOL" | "LIST"
      location_type: "URBAN" | "RURAL"
      report_status: "OPEN" | "RESOLVED" | "DISMISSED"
      review_status: "PENDING" | "APPROVED" | "REJECTED"
      school_type: "PUBLIC" | "PRIVATE"
      submission_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "NEEDS_CORRECTION"
        | "APPROVED"
        | "REJECTED"
        | "ARCHIVED"
      user_role:
        | "USER"
        | "EDITOR"
        | "SCHOOL_MANAGER"
        | "STORE_MANAGER"
        | "ADMIN"
        | "SUPER_ADMIN"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      campaign_entity_type: ["SCHOOL", "STORE"],
      campaign_status: ["SCHEDULED", "ACTIVE", "PAUSED", "ENDED"],
      ecommerce_integration_type: ["DEEP_LINK", "PAGE", "CART"],
      favorite_target_type: ["SCHOOL", "LIST"],
      location_type: ["URBAN", "RURAL"],
      report_status: ["OPEN", "RESOLVED", "DISMISSED"],
      review_status: ["PENDING", "APPROVED", "REJECTED"],
      school_type: ["PUBLIC", "PRIVATE"],
      submission_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "NEEDS_CORRECTION",
        "APPROVED",
        "REJECTED",
        "ARCHIVED",
      ],
      user_role: [
        "USER",
        "EDITOR",
        "SCHOOL_MANAGER",
        "STORE_MANAGER",
        "ADMIN",
        "SUPER_ADMIN",
      ],
    },
  },
} as const
