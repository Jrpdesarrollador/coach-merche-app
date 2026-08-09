/**
 * Tipos de la base de datos Coach Merche.
 *
 * Escritos a mano para que coincidan con supabase/migrations.
 *
 * Con el proyecto ya enlazado, `npm run db:types` genera la versión oficial en
 * `src/types/database.generated.ts`. Se deja en un fichero aparte a propósito:
 * este fichero es el que importa el código hoy, así que la migración a los
 * tipos generados se hará de forma controlada comparando ambos.
 */

export type UserRole = 'user' | 'admin'
export type ClassStatus = 'scheduled' | 'completed' | 'cancelled'
export type BookingStatus = 'active' | 'cancelled'
export type WorkoutDifficulty = 'facil' | 'media' | 'alta'
export type RewardType = 'digital' | 'physical' | 'experience'
export type UserRewardStatus = 'unlocked' | 'pending_delivery' | 'delivered'

export interface UnlockedReward {
  user_id: string
  reward_id: string
  reward_name: string
  reward_icon: string | null
  reward_type: RewardType
  status: UserRewardStatus
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          last_name: string | null
          phone: string | null
          avatar_url: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
        }
        Update: {
          name?: string
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          id: string
          title: string
          description: string | null
          poster_url: string
          video_url: string | null
          difficulty: WorkoutDifficulty | null
          duration_minutes: number | null
          category: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          poster_url: string
          video_url?: string | null
          difficulty?: WorkoutDifficulty | null
          duration_minutes?: number | null
          category?: string | null
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['workouts']['Insert']>
        Relationships: []
      }
      classes: {
        Row: {
          id: string
          workout_id: string
          date: string
          start_time: string
          location: string
          capacity: number
          status: ClassStatus
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          date: string
          start_time: string
          location: string
          capacity: number
          status?: ClassStatus
          notes?: string | null
          created_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['classes']['Insert']>
        Relationships: []
      }
      class_bookings: {
        Row: {
          id: string
          class_id: string
          user_id: string
          status: BookingStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          user_id: string
          status?: BookingStatus
        }
        Update: { status?: BookingStatus }
        Relationships: []
      }
      attendance: {
        Row: {
          id: string
          class_id: string
          user_id: string
          attended: boolean
          confirmed_by: string | null
          confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          user_id: string
          attended?: boolean
          confirmed_by?: string | null
          confirmed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          title: string
          content: string | null
          image_url: string | null
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          image_url?: string | null
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['posts']['Insert']>
        Relationships: []
      }
      rewards: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          required_workouts: number
          reward_type: RewardType
          prize_description: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          required_workouts: number
          reward_type: RewardType
          prize_description?: string | null
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['rewards']['Insert']>
        Relationships: []
      }
      user_rewards: {
        Row: {
          id: string
          user_id: string
          reward_id: string
          unlocked_at: string
          status: UserRewardStatus
          delivered_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          reward_id: string
          status?: UserRewardStatus
        }
        Update: {
          status?: UserRewardStatus
          delivered_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      class_availability: {
        Row: {
          class_id: string
          capacity: number
          booked_count: number
          available_count: number
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      book_class: {
        Args: { p_class_id: string }
        Returns: Database['public']['Tables']['class_bookings']['Row']
      }
      cancel_booking: {
        Args: { p_class_id: string }
        Returns: Database['public']['Tables']['class_bookings']['Row']
      }
      workout_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      sync_user_rewards: {
        Args: { p_user_id: string }
        Returns: UnlockedReward[]
      }
      confirm_class_attendance: {
        Args: { p_class_id: string; p_attendee_ids: string[] }
        Returns: UnlockedReward[]
      }
      mark_reward_delivered: {
        Args: { p_user_reward_id: string }
        Returns: Database['public']['Tables']['user_rewards']['Row']
      }
    }
    // El esquema no declara tipos enum ni compuestos: los valores cerrados
    // (`role`, `status`, `difficulty`...) se validan con CHECK constraints y se
    // representan arriba como uniones de string.
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Profile = Tables<'profiles'>
export type Workout = Tables<'workouts'>
export type ClassRow = Tables<'classes'>
export type ClassBooking = Tables<'class_bookings'>
export type Attendance = Tables<'attendance'>
export type Post = Tables<'posts'>
export type Reward = Tables<'rewards'>
export type UserReward = Tables<'user_rewards'>
export type ClassAvailability = Database['public']['Views']['class_availability']['Row']
