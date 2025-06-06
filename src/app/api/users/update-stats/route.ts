import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { tradie_id, rating } = await request.json();

    const { data: user } = await supabase
      .from("users")
      .select("completed_jobs, average_rating")
      .eq("id", tradie_id)
      .single();

    const newCompletedJobs = (user.completed_jobs || 0) + 1;
    const newAverageRating =
      ((user.average_rating || 0) * user.completed_jobs + rating) /
      newCompletedJobs;

    const isTopTradie = newCompletedJobs >= 10 && newAverageRating >= 4.5;

    const { data, error } = await supabase
      .from("users")
      .update({
        completed_jobs: newCompletedJobs,
        average_rating: newAverageRating,
        top_tradie: isTopTradie,
      })
      .eq("id", tradie_id)
      .select();

    if (error) throw error;
    return NextResponse.json({
      message: "Stats updated",
      top_tradie: isTopTradie,
      data: data[0],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
