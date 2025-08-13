import NextAuth, { NextAuthOptions, Session, User } from "next-auth"; // kept for potential client pages still using next-auth
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for full access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false, // We don't need session persistence for the service role
    },
  }
);

// Custom adapter to handle user lookups with profiles
const customAdapter = {
  ...SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    schema: "public", // Use 'public' for accounts, users, etc.
  }),
  async createUser(
    userData: Omit<User, "id"> & { id?: string }
  ): Promise<User> {
    if (!userData.email) {
      throw new Error("Email is required for user creation");
    }

    // Check if user exists in auth.users
    const { data: authUser, error: authError } =
      await supabase.auth.admin.listUsers();
    const existingUser = authUser?.users.find(
      (u) => u.email === userData.email
    );

    if (authError || !existingUser) {
      console.error(
        "createUser error: User not found in auth.users",
        authError
      );
      throw new Error("User not found in auth.users");
    }

    return {
      id: existingUser.id,
      email: userData.email,
      role: "client",
      created_at: new Date().toISOString(),
    };
  },
  async getUser(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .rpc("get_user_with_profile", { user_id: id })
      .single();

    if (error || !data) {
      // console.error("getUser error:", error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role,
      created_at: data.created_at,
    };
  },
  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .rpc("get_user_by_email_with_profile", { user_email: email })
      .single();

    if (error || !data) {
      // console.error("getUserByEmail error:", error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role,
      created_at: data.created_at,
    };
  },
  async getUserByAccount({
    providerAccountId,
    provider,
  }: {
    providerAccountId: string;
    provider: string;
  }): Promise<User | null> {
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("user_id")
      .eq("provider_account_id", providerAccountId)
      .eq("provider", provider)
      .single();

    if (accountError || !account) {
      // console.error("getUserByAccount account error:", accountError);
      return null;
    }

    const { data, error } = await supabase
      .rpc("get_user_with_profile", { user_id: account.user_id })
      .single();

    if (error || !data) {
      // console.error("getUserByAccount user error:", error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role,
      created_at: data.created_at,
    };
  },
  async linkAccount(account: {
    userId: string;
    provider: string;
    providerAccountId: string;
    access_token?: string;
    expires_at?: number;
    scope?: string;
    token_type?: string;
    id_token?: string;
  }): Promise<void> {
    if (!account.userId) {
      // console.error("linkAccount error: userId is missing from account object");
      throw new Error("User ID is missing; cannot link account");
    }

    const { error } = await supabase.from("accounts").insert({
      user_id: account.userId,
      provider: account.provider,
      provider_account_id: account.providerAccountId,
      access_token: account.access_token,
      expires_at: account.expires_at,
      scope: account.scope,
      token_type: account.token_type,
      id_token: account.id_token,
    });

    if (error) {
      // console.error("linkAccount insert error:", error);
      throw new Error(`Failed to link account: ${error.message}`);
    }
  },
  async createSession(session: {
    sessionToken: string;
    userId: string;
    expires: Date;
  }) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        session_token: session.sessionToken,
        user_id: session.userId,
        expires: session.expires.toISOString(),
      })
      .select()
      .single();

    if (error) {
      // console.error("createSession error:", error);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return {
      sessionToken: data.session_token,
      userId: data.user_id,
      expires: new Date(data.expires),
    };
  },
  async getSessionAndUser(sessionToken: string) {
    // Fetch the session from public.sessions
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .single();

    if (sessionError || !session) {
      // console.error("getSessionAndUser session error:", sessionError);
      return null;
    }

    if (new Date(session.expires) < new Date()) {
      return null; // Session expired
    }

    // Manually fetch the user from auth.users using the admin API
    const { data: user, error: userError } =
      await supabase.auth.admin.getUserById(session.user_id);

    if (userError || !user?.user) {
      // console.error("getSessionAndUser user error:", userError);
      return null;
    }

    // Fetch the profile from public.profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, created_at")
      .eq("id", session.user_id)
      .single();

    if (profileError) {
      // console.error("getSessionAndUser profile error:", profileError);
    }

    return {
      session: {
        sessionToken: session.session_token,
        userId: session.user_id,
        expires: new Date(session.expires),
      },
      user: {
        id: user.user.id,
        email: user.user.email,
        role: profile?.role || "client",
        created_at: profile?.created_at || new Date().toISOString(),
      },
    };
  },
  async updateSession(session: { sessionToken: string; expires?: Date }) {
    const { data, error } = await supabase
      .from("sessions")
      .update({
        expires: session.expires?.toISOString(),
      })
      .eq("session_token", session.sessionToken)
      .select()
      .single();

    if (error || !data) {
      // console.error("updateSession error:", error);
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return {
      sessionToken: data.session_token,
      userId: data.user_id,
      expires: new Date(data.expires),
    };
  },
  async deleteSession(sessionToken: string) {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("session_token", sessionToken);

    if (error) {
      // console.error("deleteSession error:", error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  },
};

// Extend the Session type to include custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string;
      role?: string;
      created_at?: string;
    };
  }

  interface User {
    id: string;
    email?: string;
    role?: string;
    created_at?: string;
  }
}

const authOptions: NextAuthOptions = {
  adapter: customAdapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email;
      if (!email) {
        console.error("signIn error: Email is missing from user object");
        return false;
      }

      const { data: existingUsers, error: listError } =
        await supabase.auth.admin.listUsers();
      if (listError) {
        return false;
      }

      const existingUser = existingUsers.users.find((u) => u.email === email);
      if (existingUser) {
        user.id = existingUser.id;
        return true;
      }

      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: email,
          email_confirmed_at: new Date().toISOString(),
          user_metadata: {
            name: user.name,
            picture: user.image,
          },
        });

      if (createError) {
        console.error("signIn create user error:", createError);
        return false;
      }

      user.id = newUser.user.id;
      return true;
    },
    async session({ session, user }: { session: Session; user: User }) {
      // Always fetch the latest profile role from Supabase
      try {
        const supabaseSession = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: profile, error } = await supabaseSession
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        session.user = {
          ...session.user,
          id: user.id,
          role: profile?.role ?? user.role ?? null,
          hasProfile: user.hasProfile ?? false,
        };
      } catch (err) {
        session.user = {
          ...session.user,
          id: user.id,
          role: user.role ?? null,
          hasProfile: user.hasProfile ?? false,
        };
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/dashboard`; // ⬅️ Redirects all users to dashboard
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
