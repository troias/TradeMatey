import React from "react";
import Link from "next/link";

// Tradie type definition intentionally omitted here; component accepts unknown and narrows at runtime

const skillIcons: Record<string, string> = {
  plumbing: "🔧",
  gas_fitting: "🔥",
  carpentry: "🔨",
  drywall: "🧱",
  electrical: "⚡",
  solar_installation: "☀️",
  tiling: "🏠",
  waterproofing: "💧",
  painting: "🎨",
  plastering: "🏗️",
};

const locationEmojis: Record<string, string> = {
  Sydney: "🌊",
  Melbourne: "☕",
  Brisbane: "🌴",
  Perth: "🌅",
  Adelaide: "🍷",
};

export default function TradieCard({ tradie }: { tradie: unknown }) {
  const t = tradie as Record<string, unknown>;
  const id = typeof t.id === "string" ? t.id : typeof t.user_id === "string" ? t.user_id : "";
  const primarySkill =
    (Array.isArray(t.skills) ? (t.skills[0] as string) : "general") ||
    "general";
  const skillIcon = skillIcons[primarySkill] || "🛠️";
  const locationEmoji = locationEmojis[(t.location as string) || ""] || "📍";

  const ratings = (t.ratings as Record<string, unknown>) || { average: 0 };
  const avg =
    typeof ratings.average === "number"
      ? ratings.average
      : Number(ratings.average) || 0;
  const isTopTradie = avg >= 4.7;

  // Generate star rating
  const fullStars = Math.floor(avg);
  const hasHalfStar = avg % 1 >= 0.5;

  const card = (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-lg dark:bg-gray-900 border border-gray-100 dark:border-gray-800 min-w-[280px] max-w-[400px] w-full mx-auto p-3 sm:p-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 opacity-100 dark:from-gray-900/20 dark:via-gray-800/20 dark:to-gray-700/20 rounded-2xl" />

      {/* Top badges */}
      <div className="flex flex-col gap-1 mb-3 z-10">
        {isTopTradie && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-pulse">
            ⭐ Top Rated Professional
          </div>
        )}
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
          ✅ Verified & Insured
        </div>
      </div>

      {/* Header section */}
      <div className="mb-4 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-2xl">
            {skillIcon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {primarySkill.replace("_", " ").toUpperCase()} EXPERT
            </h3>
            <div className="flex items-center gap-1 text-sm">
              <span>{locationEmoji}</span>
              <span className="font-semibold text-gray-600 dark:text-gray-400">
                {(t.location as string) ?? ""}
              </span>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-sm ${
                      i < fullStars
                        ? "text-yellow-400"
                        : i === fullStars && hasHalfStar
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  >
                    {i < fullStars || (i === fullStars && hasHalfStar)
                      ? "⭐"
                      : "☆"}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {(t.bio as string) ?? ""}
            </p>
          </div>
        </div>
      </div>

  {/* Core Specialties */}
      <div className="mb-4 relative z-10">
        <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
          <span>🎯</span> Core Specialties
        </h4>
        <div className="space-y-2">
          {(Array.isArray(t.skills) ? t.skills : []).map((skill) => (
            <div
              key={skill}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <span className="text-xl">{skillIcons[skill] || "🛠️"}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {(skill as string).replace("_", " ").toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // If we have an id, make the whole card a link to the tradie's profile.
  if (id) {
    return (
      <Link href={`/client/tradie/${id}`} className="block no-underline">
        {card}
      </Link>
    );
  }
  // No id available — render a visible CTA that navigates using user_id when possible.
  const fallbackId = (t.user_id as string) || '';
  return (
    <div>
      {card}
      <div className="mt-2 text-center">
        {fallbackId ? (
          <a
            href={`/client/tradie/${fallbackId}`}
            className="inline-block px-3 py-2 rounded-md bg-indigo-600 text-white text-sm"
            aria-label="View tradie profile"
          >
            View profile
          </a>
        ) : (
          <span className="inline-block px-3 py-2 rounded-md bg-gray-200 text-gray-700 text-sm">No profile available</span>
        )}
      </div>
    </div>
  );
}
