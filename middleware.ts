import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase server client that works in Middleware (Edge)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Read current auth user from Supabase cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  // Admin area: strict guard with minimal leakage
  if (path.startsWith("/admin")) {
    const isLogin = path.startsWith("/admin/login");
    const isAccept = path.startsWith("/admin/accept");
    // Allow access to login and accept pages without admin role
    if (isLogin || isAccept) return res;
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = (roles || []).some(
      (r: { role: string }) => r.role === "admin"
    );
    if (!isAdmin) {
      return NextResponse.rewrite(new URL("/_not-found", req.url));
    }
    return res;
  }

  if (!user) return res; // Let unauthenticated requests pass elsewhere; pages can guard themselves

  // Load roles for this user
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) return res; // don't block on DB errors

  const roleList = (roles?.map((r: { role: string }) => r.role) ??
    []) as string[];

  // If only one role, ensure cookie aligns and proceed
  if (roleList.length <= 1) {
    if (roleList.length === 1) {
      const cookieRole = req.cookies.get("activeRole")?.value;
      if (cookieRole !== roleList[0]) {
        res.cookies.set("activeRole", roleList[0], {
          path: "/",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
        });
      }
    }
    return res;
  }

  // Multiple roles: enforce role selection for role-scoped routes
  const activeRole = req.cookies.get("activeRole")?.value || null;
  const isTradiePath = path.startsWith("/tradie");
  const isClientPath = path.startsWith("/client");

  // If no active role or invalid, prompt selection
  if (!activeRole || !roleList.includes(activeRole)) {
    const url = req.nextUrl.clone();
    url.pathname = "/select-role";
    return NextResponse.redirect(url);
  }

  // If path doesn't match the chosen role, prompt selection
  if (
    (isTradiePath && activeRole !== "tradie") ||
    (isClientPath && activeRole !== "client")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/select-role";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/tradie/:path*", "/client/:path*", "/admin/:path*"],
};
