import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Delegate to the centralized handler so user can choose role if needed.
  return NextResponse.redirect(
    new URL("/auth/callback" + (new URL(request.url).search || ""), request.url)
  );
}
