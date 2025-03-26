import Link from "next/link";
import { Tradie } from "@/lib/types";

export default function TradieCard({ tradie }: { tradie: Tradie }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold">{tradie.name}</h3>
      <p>{tradie.trade}</p>
      <p>{tradie.location}</p>
      <Link href={`/tradies/${tradie.id}`} className="text-blue-600">
        View Profile
      </Link>
    </div>
  );
}
