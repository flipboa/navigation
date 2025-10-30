export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          parent_id: string | null
          sort_order: number
          is_active: boolean
          show_on_homepage: boolean
          tools_count: number
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          show_on_homepage?: boolean
          tools_count?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          show_on_homepage?: boolean
          tools_count?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          nickname: string
          email: string
          avatar_url: string | null
          role: string
          bio: string | null
          website: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nickname: string
          email: string
          avatar_url?: string | null
          role?: string
          bio?: string | null
          website?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          email?: string
          avatar_url?: string | null
          role?: string
          bio?: string | null
          website?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      submissions: {
        Row: {
          id: string
          tool_name: string
          tool_description: string
          tool_content: string | null
          tool_website_url: string
          tool_logo_url: string | null
          tool_screenshots: Json | null
          category_id: string
          tool_tags: Json | null
          tool_type: string | null
          pricing_info: Json | null
          submitter_email: string | null
          submitter_name: string | null
          submission_notes: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_by: string | null
          reviewed_by: string | null
          submitted_at: string | null
          review_notes: string | null
          review_started_at: string | null
          review_completed_at: string | null
          version: number | null
          parent_submission_id: string | null
          is_latest_version: boolean | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tool_name: string
          tool_description: string
          tool_content?: string | null
          tool_website_url: string
          tool_logo_url?: string | null
          tool_screenshots?: Json | null
          category_id: string
          tool_tags?: Json | null
          tool_type?: string | null
          pricing_info?: Json | null
          submitter_email?: string | null
          submitter_name?: string | null
          submission_notes?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          review_notes?: string | null
          review_started_at?: string | null
          review_completed_at?: string | null
          version?: number | null
          parent_submission_id?: string | null
          is_latest_version?: boolean | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tool_name?: string
          tool_description?: string
          tool_content?: string | null
          tool_website_url?: string
          tool_logo_url?: string | null
          tool_screenshots?: Json | null
          category_id?: string
          tool_tags?: Json | null
          tool_type?: string | null
          pricing_info?: Json | null
          submitter_email?: string | null
          submitter_name?: string | null
          submission_notes?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          review_notes?: string | null
          review_started_at?: string | null
          review_completed_at?: string | null
          version?: number | null
          parent_submission_id?: string | null
          is_latest_version?: boolean | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_parent_submission_id_fkey"
            columns: ["parent_submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      submission_reviews: {
        Row: {
          id: string
          submission_id: string
          action: Database["public"]["Enums"]["review_action"]
          notes: string | null
          reviewer_id: string | null
          created_at: string
          previous_status: Database["public"]["Enums"]["submission_status"] | null
          new_status: Database["public"]["Enums"]["submission_status"] | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          submission_id: string
          action: Database["public"]["Enums"]["review_action"]
          notes?: string | null
          reviewer_id?: string | null
          created_at?: string
          previous_status?: Database["public"]["Enums"]["submission_status"] | null
          new_status?: Database["public"]["Enums"]["submission_status"] | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          submission_id?: string
          action?: Database["public"]["Enums"]["review_action"]
          notes?: string | null
          reviewer_id?: string | null
          created_at?: string
          previous_status?: Database["public"]["Enums"]["submission_status"] | null
          new_status?: Database["public"]["Enums"]["submission_status"] | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          }
        ]
      }
      tools: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          content: string | null
          website_url: string
          logo_url: string | null
          screenshots: Json | null
          category_id: string
          tags: Json | null
          tool_type: string | null
          pricing_info: Json | null
          view_count: number | null
          click_count: number | null
          is_featured: boolean | null
          is_active: boolean | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description: string
          content?: string | null
          website_url: string
          logo_url?: string | null
          screenshots?: Json | null
          category_id: string
          tags?: Json | null
          tool_type?: string | null
          pricing_info?: Json | null
          view_count?: number | null
          click_count?: number | null
          is_featured?: boolean | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          content?: string | null
          website_url?: string
          logo_url?: string | null
          screenshots?: Json | null
          category_id?: string
          tags?: Json | null
          tool_type?: string | null
          pricing_info?: Json | null
          view_count?: number | null
          click_count?: number | null
          is_featured?: boolean | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
      submission_status: "draft" | "submitted" | "reviewing" | "approved" | "rejected" | "changes_requested" | "withdrawn"
      review_action: "submit" | "start_review" | "approve" | "reject" | "request_changes" | "withdraw"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}