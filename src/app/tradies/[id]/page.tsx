// src/app/tradies/[id]/page.tsx
import { supabase } from "@/app/lib/db"; // Adjust this import path based on your actual setup
import { notFound } from "next/navigation"; // Next.js 15 built-in 404 handler
import TradieProfileUI from "./TradieProfileUI.client"; // Client Component for UI rendering

export default async function TradieProfile({
  params,
}: {
  params: { id: string };
}) {
  // Fetch the tradie data from the database
  const { data: tradie, error } = await supabase
    .from("tradies")
    .select("id, name, trade, location, bio, user_id")
    .eq("id", params.id)
    .single();

  // Handle errors or missing tradie data
  if (error || !tradie) {
    return notFound(); // This triggers a 404 if no tradie is found
  }

  // Pass fetched data to Client Component for rendering
  return <TradieProfileUI tradie={tradie} />;
}
