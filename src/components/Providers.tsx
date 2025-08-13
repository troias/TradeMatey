// ./src/components/Providers.tsx
"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Add imports
import { createClient } from "@/lib/supabase/client";

// Create a QueryClient instance
const queryClient = new QueryClient();

// Job Context
interface JobItem {
  id: string;
  [key: string]: unknown;
}
interface JobContextType {
  jobs: JobItem[];
  addJob: (job: JobItem) => void;
  updateJob: (jobId: string, updates: Partial<JobItem>) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<JobItem[]>([]);

  const addJob = (job: JobItem) => {
    setJobs((prevJobs) => [...prevJobs, job]);
  };

  const updateJob = (jobId: string, updates: Partial<JobItem>) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
    );
  };

  return (
    <JobContext.Provider value={{ jobs, addJob, updateJob }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobContext);
  if (!context) throw new Error("useJobs must be used within a JobProvider");
  return context;
}

// Combined Providers
// Supabase Auth Context -----------------------------------------
interface AuthUser {
  id: string;
  email?: string | null;
}
interface AuthContextType {
  user: AuthUser | null;
  role: string | null;
  setRole: (role: string) => void;
  userRoles: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: (redirectTo?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRoleState] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Persist active role in localStorage
  const setRole = (newRole: string) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("activeRole", newRole);
      // Also persist in cookie so server routes can honor it
      document.cookie = `activeRole=${newRole}; Path=/; Max-Age=2592000; SameSite=Lax`;
    }
  };

  // Load all roles from user_roles table, with fallback to legacy profiles.role
  const loadRoles = useCallback(
    async (uid: string) => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        if (!error && data) {
          // Deduplicate roles to avoid duplicate keys/rendering issues downstream
          const roles = Array.from(
            new Set<string>(data.map((r: { role: string }) => r.role))
          );
          if (roles.length > 0) {
            setUserRoles(roles);
            // Set active role from localStorage; if multiple and none saved, leave null (force selection)
            let activeRole: string | null = null;
            if (typeof window !== "undefined") {
              activeRole = window.localStorage.getItem("activeRole");
              if (!activeRole) {
                const m = document.cookie.match(/(?:^|; )activeRole=([^;]+)/);
                activeRole = m ? decodeURIComponent(m[1]) : null;
              }
            }
            if (activeRole && roles.includes(activeRole)) {
              setRoleState(activeRole);
            } else if (roles.length === 1) {
              setRoleState(roles[0]);
            } else {
              setRoleState(null);
            }
            return;
          }
        }
        // Fallback to profiles.role if no user_roles found
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();
        if (!profErr && prof?.role) {
          setUserRoles([prof.role]);
          setRoleState(prof.role);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("activeRole", prof.role);
          }
        } else {
          setUserRoles([]);
          setRoleState(null);
        }
      } catch {
        /* ignore */
      }
    },
    [supabase]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    if (user) await loadRoles(user.id);
    setLoading(false);
  }, [supabase, loadRoles]);

  useEffect(() => {
    refresh();
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadRoles(session.user.id);
      else {
        setRoleState(null);
        setUserRoles([]);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadRoles, refresh]);

  const handleSignOut = useCallback(
    async (redirectTo?: string) => {
      await supabase.auth.signOut();
      setUser(null);
      setRoleState(null);
      setUserRoles([]);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("activeRole");
        // Clear cookie
        document.cookie = "activeRole=; Path=/; Max-Age=0; SameSite=Lax";
      }
      if (redirectTo) {
        window.location.assign(redirectTo);
      }
    },
    [supabase]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        setRole,
        userRoles,
        loading,
        refresh,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <JobProvider>{children}</JobProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
