import Link from "next/link";

export interface Tradie {
  id: string;
  location: string;
  bio: string;
  user_id: string;
  certifications: Record<string, string>;
  ratings: {
    count: number;
    average: number;
  };
  skills: string[];
}

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

export default function TradieCard({ tradie }: { tradie: Tradie }) {
  const primarySkill = tradie.skills[0];
  const skillIcon = skillIcons[primarySkill] || "🛠️";
  const locationEmoji = locationEmojis[tradie.location] || "📍";

  const isTopTradie = tradie.ratings.average >= 4.7;

  // Generate star rating
  const fullStars = Math.floor(tradie.ratings.average);
  const hasHalfStar = tradie.ratings.average % 1 >= 0.5;

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-lg dark:bg-gray-900 border border-gray-100 dark:border-gray-800 min-w-[280px] max-w-[400px] w-full mx-auto p-3 sm:p-4">
      {/* Animated gradient background - allow pointer events to pass through */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 opacity-100 dark:from-gray-900/20 dark:via-gray-800/20 dark:to-gray-700/20 rounded-2xl pointer-events-none" />

      <Link
        href={`/client/tradie/${tradie.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${tradie.location} tradie`}
      >
        {/* empty link layer to make card clickable */}
      </Link>

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
                {tradie.location}
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
              {tradie.bio}
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
          {tradie.skills.map((skill) => (
            <div
              key={skill}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <span className="text-xl">{skillIcons[skill] || "🛠️"}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {skill.replace("_", " ").toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
