import Link from "next/link";
import { Tradie } from "@/lib/types";

export default function TradieCard({ tradie }: { tradie: Tradie }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow hover:shadow-2xl dark:bg-gray-900">
      {/* Background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 transition-opacity group-hover:opacity-30 dark:from-gray-800" />

      <div className="relative z-10 p-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {tradie.name}
        </h3>
        <p className="mt-2 text-lg font-medium text-gray-600 dark:text-gray-400">
          {tradie.trade}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          📍 {tradie.location}
        </p>

        {tradie.top_tradie && (
          <span className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded">
            Top Tradie
          </span>
        )}

        <Link
          href={`/tradies/${tradie.id}`}
          className="mt-4 inline-block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-white font-medium transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500"
        >
          View Profile →
        </Link>
      </div>
    </div>
  );
}
