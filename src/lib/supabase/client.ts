import { createBrowserClient } from "@supabase/ssr";

// Create a browser Supabase client. We intentionally disable automatic
// background token refresh (autoRefreshToken: false) to avoid uncaught
// "Failed to fetch" errors when the auth endpoint is temporarily
// unreachable (e.g., network flakiness or during certain CI scenarios).
// The app can still call auth.refreshSession() manually when needed.
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Do not automatically attempt to refresh in the background
        autoRefreshToken: false,
        // Keep persisting the session in local storage
        persistSession: true,
      },
    }
  );
