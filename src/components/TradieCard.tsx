import Link from "next/link";
import { useState } from "react";

interface Tradie {
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
  const [isHovered, setIsHovered] = useState(false);

  const primarySkill = tradie.skills[0];
  const skillIcon = skillIcons[primarySkill] || "🛠️";
  const locationEmoji = locationEmojis[tradie.location] || "📍";

  const isTopTradie = tradie.ratings.average >= 4.7;
  const certificationCount = Object.keys(tradie.certifications).length;

  // Generate star rating
  const fullStars = Math.floor(tradie.ratings.average);
  const hasHalfStar = tradie.ratings.average % 1 >= 0.5;

  return (
    <div
      className="group relative overflow-hidden rounded-3xl bg-white shadow-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-0 transition-all duration-700 group-hover:opacity-60 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20" />

      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 transition-opacity duration-500 group-hover:opacity-20 blur-xl" />

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-0 transition-all duration-1000 group-hover:opacity-60 ${
              isHovered ? "animate-pulse" : ""
            }`}
            style={{
              left: `${20 + i * 30}%`,
              top: `${10 + i * 20}%`,
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>

      {/* Top badges */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {isTopTradie && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
            ⭐ Top Tradie
          </div>
        )}
        {certificationCount > 1 && (
          <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            🏆 {certificationCount} Certs
          </div>
        )}
      </div>

      <div className="relative z-10 p-8">
        {/* Header section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg transform transition-transform group-hover:rotate-12">
              {skillIcon}
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
                {primarySkill.replace("_", " ").toUpperCase()} SPECIALIST
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">{locationEmoji}</span>
                <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                  {tradie.location}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio section */}
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed font-medium">
            {tradie.bio}
          </p>
        </div>

        {/* Rating section */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-xl ${
                    i < fullStars
                      ? "text-yellow-400"
                      : i === fullStars && hasHalfStar
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                >
                  {i < fullStars
                    ? "⭐"
                    : i === fullStars && hasHalfStar
                    ? "⭐"
                    : "☆"}
                </span>
              ))}
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {tradie.ratings.average}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {tradie.ratings.count} reviews
            </div>
          </div>
        </div>

        {/* Skills section */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Specialties
          </h4>
          <div className="flex flex-wrap gap-2">
            {tradie.skills.map((skill, index) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-xl transition-all duration-300 group-hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span>{skillIcons[skill] || "🛠️"}</span>
                {skill.replace("_", " ").toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <Link href={`/tradie/${tradie.id}`} className="relative block w-full">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-[2px] shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105">
            <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-6 py-4 text-center transition-all duration-300">
              <span className="text-white font-bold text-lg tracking-wide">
                View Profile & Book Now
              </span>
              <div className="absolute inset-0 rounded-2xl bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
            </div>
          </div>
        </Link>

        {/* Bottom certifications indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>🏅</span>
          <span>Fully Licensed & Insured</span>
          <span>•</span>
          <span>Background Checked</span>
        </div>
      </div>

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full -translate-y-10 translate-x-10 transition-all duration-500 group-hover:scale-150 group-hover:opacity-30" />
    </div>
  );
}
