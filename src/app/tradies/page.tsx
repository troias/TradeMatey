import { supabase } from "@/lib/db";
import TradieCard from "@/components/TradieCard";
import { Tradie } from "@/lib/types";

// Add revalidation for dynamic data
export const revalidate = 60; // Revalidate every 60 seconds

export default async function TradiesPage() {
  const { data: tradies, error } = await supabase.from("tradies").select("*");

  if (error) return <p>Error loading tradies: {error.message}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {tradies?.map((tradie: Tradie) => (
        <TradieCard key={tradie.id} tradie={tradie} />
      ))}
    </div>
  );
}
