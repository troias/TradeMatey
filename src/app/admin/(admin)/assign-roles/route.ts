import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { user_id, new_roles } = await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.rpc("assign_user_role", {
      user_id: user_id,
      new_roles: new_roles,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ message: "Roles assigned successfully" });
  } catch (error: any) {
    console.error("Role assignment error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
