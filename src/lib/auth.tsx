import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { createClient } from "@/lib/supabase/server";

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials?.email || "",
          password: credentials?.password || "",
        });
        if (error || !data.user) return null;
        const { data: userData } = await supabase
          .from("users")
          .select("id, email, has_completed_onboarding, profiles(role)")
          .eq("id", data.user.id)
          .single();
        if (!userData) return null;
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        const roles = (roleRows || []).map((r: { role: string }) => r.role);
        return {
          id: userData.id,
          email: userData.email,
          roles,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          profile_role: (userData as any)?.profiles?.role || null,
          has_completed_onboarding: userData.has_completed_onboarding ?? false,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const supabase = createClient();
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("user_id", (user as any).id);
      const roles = (roleRows || []).map((r: { role: string }) => r.role);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).roles = roles;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).profile_role = (user as any).profile_role;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).has_completed_onboarding = (
        user as any
      ).has_completed_onboarding;
      return session;
    },
    // Keep redirect logic minimal; client-side callback page handles nuanced redirects
    async redirect({ baseUrl }) {
      return baseUrl;
    },
  },
};
