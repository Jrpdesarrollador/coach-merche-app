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
export type MembershipTier = 'basic' | 'pro'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type SubscriptionPlan = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'
export type ChatSenderRole = 'user' | 'admin'
export type ReportPeriod = 'week' | 'month' | 'quarter' | 'semester' | 'year'
export type ClassStatus = 'scheduled' | 'completed' | 'cancelled'
export type BookingStatus = 'active' | 'cancelled'
export type BookingSource = 'app' | 'manual'
export type ManualResetScope = 'payments' | 'attendance' | 'bookings' | 'all'
export type WorkoutDifficulty = 'facil' | 'media' | 'alta'
export type RewardType = 'digital' | 'physical' | 'experience'
export type UserRewardStatus = 'unlocked' | 'pending_delivery' | 'delivered'
export type PaymentStatus = 'pending' | 'paid' | 'overdue'
export type NotificationType =
  | 'class_reminder'
  | 'new_workout'
  | 'new_class'
  | 'custom'
  | 'booking_confirmed'
  | 'new_post'

export type PostMediaType = 'none' | 'image' | 'video'

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
          membership_tier: MembershipTier
          approval_status: ApprovalStatus
          approved_at: string | null
          approved_by: string | null
          subscription_plan: SubscriptionPlan | null
          subscription_status: SubscriptionStatus | null
          subscription_ends_at: string | null
          is_manual: boolean
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          membership_tier?: MembershipTier
          approval_status?: ApprovalStatus
          is_manual?: boolean
          admin_notes?: string | null
        }
        Update: {
          name?: string
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          membership_tier?: MembershipTier
          approval_status?: ApprovalStatus
          subscription_plan?: SubscriptionPlan | null
          subscription_status?: SubscriptionStatus | null
          subscription_ends_at?: string | null
          is_manual?: boolean
          admin_notes?: string | null
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
          video_path: string | null
          requires_pro: boolean
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
          video_path?: string | null
          requires_pro?: boolean
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
          source: BookingSource
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          user_id: string
          status?: BookingStatus
          source?: BookingSource
        }
        Update: { status?: BookingStatus; source?: BookingSource }
        Relationships: []
      }
      manual_payments: {
        Row: {
          id: string
          user_id: string
          amount_cents: number
          classes_credited: number
          paid_at: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount_cents: number
          classes_credited: number
          paid_at: string
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          amount_cents?: number
          classes_credited?: number
          paid_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      manual_attendance_records: {
        Row: {
          id: string
          user_id: string
          attendance_date: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          attendance_date: string
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          attendance_date?: string
          notes?: string | null
        }
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
          image_path: string | null
          video_path: string | null
          media_type: PostMediaType
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          image_url?: string | null
          image_path?: string | null
          video_path?: string | null
          media_type?: PostMediaType
          published?: boolean
          published_at?: string | null
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
      payments: {
        Row: {
          id: string
          user_id: string
          month: string
          amount_cents: number
          status: PaymentStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          amount_cents: number
          status?: PaymentStatus
          notes?: string | null
        }
        Update: {
          amount_cents?: number
          status?: PaymentStatus
          notes?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          sender_role: ChatSenderRole
          body: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sender_role: ChatSenderRole
          body: string
        }
        Update: {
          read_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          type: NotificationType
          title: string
          body: string
          read_at: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: NotificationType
          title: string
          body: string
          metadata?: Record<string, unknown>
        }
        Update: {
          read_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          keys: Record<string, string>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          keys: Record<string, string>
        }
        Update: {
          keys?: Record<string, string>
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
      notify_class_reminders: {
        Args: Record<string, never>
        Returns: number
      }
      upsert_push_subscription: {
        Args: { p_endpoint: string; p_keys: Record<string, string> }
        Returns: Database['public']['Tables']['push_subscriptions']['Row']
      }
      delete_push_subscription: {
        Args: { p_endpoint: string }
        Returns: boolean
      }
      admin_list_pending_rewards: {
        Args: Record<string, never>
        Returns: {
          user_reward_id: string
          user_id: string
          user_name: string
          user_last_name: string | null
          reward_id: string
          reward_name: string
          reward_icon: string | null
          required_workouts: number
          unlocked_at: string
        }[]
      }
      admin_get_user_rewards: {
        Args: { p_user_id: string }
        Returns: {
          user_reward_id: string
          reward_id: string
          reward_name: string
          reward_icon: string | null
          reward_type: string
          required_workouts: number
          status: string
          unlocked_at: string
          delivered_at: string | null
        }[]
      }
      admin_list_profiles: {
        Args: Record<string, never>
        Returns: {
          id: string
          name: string
          last_name: string | null
          email: string
          phone: string | null
          avatar_url: string | null
          role: string
          membership_tier: string
          approval_status: string
          subscription_plan: string | null
          subscription_status: string | null
          subscription_ends_at: string | null
        }[]
      }
      admin_list_users_with_stats: {
        Args: Record<string, never>
        Returns: {
          id: string
          name: string
          last_name: string | null
          email: string
          phone: string | null
          avatar_url: string | null
          role: string
          membership_tier: string
          approval_status: string
          approved_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          subscription_ends_at: string | null
          created_at: string
          bookings_count: number
          attendance_count: number
          last_activity_at: string
        }[]
      }
      admin_approve_user: {
        Args: {
          p_user_id: string
          p_tier: string
          p_subscription_plan?: string | null
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      admin_set_membership_tier: {
        Args: {
          p_user_id: string
          p_tier: string
          p_subscription_plan?: string | null
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      admin_reject_user: {
        Args: { p_user_id: string }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      admin_export_report: {
        Args: { p_period: string; p_start_date?: string | null }
        Returns: Record<string, unknown>
      }
      admin_list_chat_threads: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          name: string
          last_name: string | null
          email: string
          last_message: string
          last_message_at: string
          unread_count: number
        }[]
      }
      is_pro_member: {
        Args: { p_user_id?: string | null }
        Returns: boolean
      }
      admin_get_class_participants: {
        Args: { p_class_id: string }
        Returns: {
          booking_id: string
          user_id: string
          name: string
          last_name: string | null
          email: string
          booking_status: string
          booking_source: string
          is_manual: boolean
          booked_at: string
          attended: boolean
          attendance_confirmed_at: string | null
        }[]
      }
      admin_assign_to_class: {
        Args: { p_user_id: string; p_class_id: string }
        Returns: Database['public']['Tables']['class_bookings']['Row']
      }
      admin_remove_from_class: {
        Args: { p_booking_id: string }
        Returns: Database['public']['Tables']['class_bookings']['Row']
      }
      admin_create_student: {
        Args: {
          p_name: string
          p_last_name?: string | null
          p_email?: string | null
          p_notes?: string | null
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      admin_update_student: {
        Args: {
          p_user_id: string
          p_name?: string | null
          p_last_name?: string | null
          p_email?: string | null
          p_notes?: string | null
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      admin_register_manual_payment: {
        Args: {
          p_user_id: string
          p_amount_cents: number
          p_paid_at?: string | null
          p_notes?: string | null
        }
        Returns: Database['public']['Tables']['manual_payments']['Row']
      }
      admin_update_manual_payment: {
        Args: {
          p_id: string
          p_amount_cents: number
          p_paid_at: string
          p_notes?: string | null
        }
        Returns: Database['public']['Tables']['manual_payments']['Row']
      }
      admin_delete_manual_payment: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_save_manual_attendance: {
        Args: { p_date: string; p_user_ids: string[] }
        Returns: number
      }
      admin_get_manual_attendance_for_date: {
        Args: { p_date: string }
        Returns: string[]
      }
      admin_delete_manual_attendance_date: {
        Args: { p_date: string }
        Returns: number
      }
      admin_reset_manual_data: {
        Args: { p_scope: string }
        Returns: Record<string, number>
      }
      admin_list_manual_balance_summary: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          name: string
          last_name: string | null
          email: string
          is_manual: boolean
          paid_cents: number
          manual_attendance_count: number
          app_attendance_count: number
          total_attended: number
          balance_cents: number
          available_classes: number
          debt_classes: number
        }[]
      }
      admin_list_manual_payments: {
        Args: Record<string, never>
        Returns: {
          id: string
          user_id: string
          user_name: string
          amount_cents: number
          classes_credited: number
          paid_at: string
          notes: string | null
          created_at: string
        }[]
      }
      admin_list_manual_attendance: {
        Args: Record<string, never>
        Returns: {
          id: string
          user_id: string
          user_name: string
          attendance_date: string
          notes: string | null
          created_at: string
        }[]
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
export type Payment = Tables<'payments'>
export type Notification = Tables<'notifications'>
export type AdminProfile = Database['public']['Functions']['admin_list_profiles']['Returns'][number]
export type AdminUserWithStats =
  Database['public']['Functions']['admin_list_users_with_stats']['Returns'][number]
export type ChatThread =
  Database['public']['Functions']['admin_list_chat_threads']['Returns'][number]
export type ChatMessage = Tables<'chat_messages'>
export type ClassParticipant =
  Database['public']['Functions']['admin_get_class_participants']['Returns'][number]
export type ManualBalanceSummary =
  Database['public']['Functions']['admin_list_manual_balance_summary']['Returns'][number]
export type ManualPaymentRecord =
  Database['public']['Functions']['admin_list_manual_payments']['Returns'][number]
export type ManualAttendanceRecord =
  Database['public']['Functions']['admin_list_manual_attendance']['Returns'][number]
export type ManualPayment = Tables<'manual_payments'>
export type ManualAttendance = Tables<'manual_attendance_records'>
