export interface Tradie {
  id: string;
  name: string;
  trade: string;
  location: string;
  bio: string;
  user_id?: string; // Optional, added for auth
}

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

export interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  users: { name: string };
}

export interface Analytics {
  totalJobs: number;
  completionRate: number;
  newUsers: number;
}

export interface Dispute {
  id: string;
  title: string;
  jobs: { title: string };
  qbcc_dispute: boolean;
}

export interface Job {
  id: string;
  title: string;
  status: string;
  milestones: Milestone[];
  region: string;
}

export interface Milestone {
  id: string;
  title: string;
  status: string;
  amount: number;
  commission?: number;
}
