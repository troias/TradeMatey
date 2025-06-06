// src/lib/auth.tsx
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
      async authorize(credentials) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials?.email || "",
          password: credentials?.password || "",
        });
        if (error || !data.user) return null;
        const { data: userData } = await supabase
          .from("users")
          .select("id, email, role, has_completed_onboarding")
          .eq("id", data.user.id)
          .single();
        return {
          id: userData.id,
          email: userData.email,
          role: userData.role,
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
      const { data: factors } = await supabase.auth.mfa.listFactors({
        userId: user.id,
      });
      session.user.mfa_enabled = factors?.totp.length > 0;
      return session;
    },
    async redirect({ baseUrl, user }) {
      if (!user.has_completed_onboarding) {
        return user.role === "tradie"
          ? `${baseUrl}/tradie/onboarding`
          : `${baseUrl}/client/onboarding`;
      }
      return user.role === "tradie"
        ? `${baseUrl}/tradie/dashboard`
        : `${baseUrl}/client/dashboard`;
    },
  },
};
