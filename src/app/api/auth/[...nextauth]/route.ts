console.log("NextAuth route loaded");
console.log("Env vars:", {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";

import { supabase } from "@lib/db";

export const authOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      console.log("SignIn callback triggered for user:", user.id);
      if (!user.id) return false;

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert([{ id: user.id, role: "client" }]);
        if (insertError) {
          console.error("Insert error:", insertError);
          return false;
        }
      }

      return true;
    },
    async session({ session, token }) {
      console.log("Session callback triggered for token:", token.sub);
      if (token.sub) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", token.sub)
          .single();

        if (data && !error) {
          console.log("error:", error);
          console.log("data:", data);
          console.log("session:", session);

          session.user = {
            ...session.user,
            id: token.sub,
            role: data.role || "client",
          };
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
