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
      products: {
        Row: {
          id: string
          shop_id: string
          brand_id: string | null
          name: string
          slug: string
          description: string | null
          short_description: string | null
          category: string
          sub_category: string | null
          sku: string
          price: number
          original_price: number | null
          discount_percentage: number | null
          image_urls: string[]
          featured_image_url: string | null
          stock_quantity: number
          rating: number | null
          review_count: number | null
          tags: string[] | null
          is_featured: boolean
          is_trending: boolean
          featured_order: number | null
          trending_order: number | null
          published: boolean
          is_active: boolean
          expiry_date: string | null
          admin_id: string
          created_at: string
          updated_at: string
        }
        Insert: any
        Update: any
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          phone: string
          role: string
          status: string
          shop_id: string | null
          suspended: boolean
          created_at: string
          updated_at: string
        }
        Insert: any
        Update: any
      }
      product_reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          title: string | null
          comment: string | null
          verified_purchase: boolean
          created_at: string
        }
        Insert: any
        Update: any
      }
      notifications: {
        Row: {
          id: string
          type: string
          title: string
          message: string
          related_entity_id: string | null
          target_role: string | null
          read: boolean
          created_at: string
        }
        Insert: any
        Update: any
      }
      brands: {
        Row: {
          id: string
          shop_id: string
          name: string
          slug: string
          logo_url: string | null
          created_at: string
        }
        Insert: any
        Update: any
      }
      shops: {
        Row: {
          id: string
          name: string
          slug: string
          display_name: string | null
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: any
        Update: any
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
  }
}
