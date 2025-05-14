export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          phone_verified: boolean | null;
          subscription_tier: string;
          subscription_status: string;
          subscription_end_date: string | null;
          max_places: number;
          free_trial_copy_remaining: number;
          credits: number;
          last_credits_refresh: string | null;
          [key: string]: unknown;
        };
        Insert: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          subscription_tier?: string;
          subscription_status?: string;
          subscription_end_date?: string | null;
          max_places?: number;
          free_trial_copy_remaining?: number;
          credits?: number;
          last_credits_refresh?: string | null;
          [key: string]: unknown;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          subscription_tier?: string;
          subscription_status?: string;
          subscription_end_date?: string | null;
          max_places?: number;
          free_trial_copy_remaining?: number;
          credits?: number;
          last_credits_refresh?: string | null;
          [key: string]: unknown;
        };
      };
      // 다른 테이블 타입도 필요에 따라 추가할 수 있습니다
    };
    Views: Record<string, never>;
    Functions: {
      deduct_user_credits: {
        Args: {
          p_user_id: string;
          p_feature: string;
          p_amount: number;
        };
        Returns: boolean;
      };
      // 다른 함수 타입도 필요에 따라 추가할 수 있습니다
    };
    Enums: Record<string, never>;
  };
};
