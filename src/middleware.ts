import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Corrected import path
// // Adjust if needed

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Get the session using NextAuth's session handler
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    // If no session exists, send the user to the sign-in page
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/signin";
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createPagesServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name) {
          res.cookies.set({ name, value: "", maxAge: -1 });
        },
      },
    }
  );

  // Get the user from Supabase
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    console.error("User is not authenticated with Supabase.");
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/signin";
    return NextResponse.redirect(redirectUrl);
  }
  // Add Token Check: Ensure the token exists before processing
  const token = req.cookies.get("your-token-name")?.value;

  console.log("Token:", token); // Log the token to see if it is undefined

  if (!token) {
    console.error("Token is missing or invalid");
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/signin";
    return NextResponse.redirect(redirectUrl);
  }

  console.log("Cookies:", req.cookies);

  // Allow access to auth & static paths
  const skipPaths = [
    "/login",
    "/signup",
    "/onboarding",
    "/_next",
    "/favicon.ico",
  ];
  if (!user || skipPaths.some((p) => req.nextUrl.pathname.startsWith(p))) {
    return res;
  }

  // Check if user has a tradie or client profile
  const { data: tradie } = await supabase
    .from("tradies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // If user has no profile and not onboarding, redirect to onboarding
  if (!tradie && !client && !req.nextUrl.pathname.startsWith("/onboarding")) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/onboarding";
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
