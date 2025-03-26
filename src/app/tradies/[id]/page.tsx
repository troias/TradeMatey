import { supabase } from "@/lib/db";
import { Tradie } from "@/lib/types";

export default async function TradieProfile({
  params,
}: {
  params: { id: string };
}) {
  const { data: tradie, error } = await supabase
    .from("tradies")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !tradie) return <p>Tradie not found</p>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-2xl font-bold">{tradie.name}</h2>
      <p>
        {tradie.trade} - {tradie.location}
      </p>
      <p>{tradie.bio}</p>
    </div>
  );
}
