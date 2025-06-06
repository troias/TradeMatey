import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: support, error } = await supabase
      .from("support")
      .insert({ user_id: user.id, query, status: "pending" })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const response = `Support query received: ${query}. A team member will respond soon.`;
    await supabase
      .from("support")
      .update({ response, status: "responded" })
      .eq("id", support.id);

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Support error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
