import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = () => {
  return createServerClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies();
          return cookieStore.getAll();
        },
        async setAll(cookiesToSet) {
          try {
            const cookieStore = await cookies();
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore errors in Server Components
          }
        },
      },
    }
  );
};

// Backward-compatible alias expected by some routes. Optional param is ignored.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createServerClient = (_cookieStore?: unknown) => createClient();

// Avoid creating a client at module load to prevent cookies() outside request scope errors
export const supabase = undefined as unknown as ReturnType<typeof createClient>;
