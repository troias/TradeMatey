export interface User {
  id: string;
  email: string;
  role: "client" | "tradie";
}

export type UserRole =
  | "admin"
  | "marketing"
  | "finance"
  | "support"
  | "employee";
export type ProfileRole = "client" | "tradie";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          roles: UserRole[];
          completed_jobs: number;
          average_rating: number;
          top_tradie: boolean;
          referral_credits: number;
          region: string | null;
          first_job_free: boolean;
          has_completed_onboarding: boolean;
          stripe_customer_id: string | null;
          payment_method_id: string | null;
          stripe_account_id: string | null;
          license_path: string | null;
          trade: string | null;
          location: string | null;
          bio: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          roles?: UserRole[];
          completed_jobs?: number;
          average_rating?: number;
          top_tradie?: boolean;
          referral_credits?: number;
          region?: string | null;
          first_job_free?: boolean;
          has_completed_onboarding?: boolean;
          stripe_customer_id?: string | null;
          payment_method_id?: string | null;
          stripe_account_id?: string | null;
          license_path?: string | null;
          trade?: string | null;
          location?: string | null;
          bio?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          roles?: UserRole[];
          completed_jobs?: number;
          average_rating?: number;
          top_tradie?: boolean;
          referral_credits?: number;
          region?: string | null;
          first_job_free?: boolean;
          has_completed_onboarding?: boolean;
          stripe_customer_id?: string | null;
          payment_method_id?: string | null;
          stripe_account_id?: string | null;
          license_path?: string | null;
          trade?: string | null;
          location?: string | null;
          bio?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: ProfileRole;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: ProfileRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: ProfileRole;
          created_at?: string;
        };
      };
    };
    Functions: {
      assign_user_role: {
        Args: {
          user_id: string;
          new_roles: string[];
        };
        Returns: void;
      };
    };
  };
}
