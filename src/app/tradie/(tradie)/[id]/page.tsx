import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import OfferButtonServerWrapper from "@/components/OfferButtonServerWrapper";

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

const certificationIcons: Record<string, string> = {
  plumbing: "🚰",
  gas_fitting: "🔥",
  carpentry: "🪚",
  electrical: "⚡",
  solar_installation: "☀️",
  tiling: "🏠",
  painting: "🎨",
  waterproofing: "💧",
};

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded-lg mb-4"></div>
            <div className="h-64 bg-gray-300 rounded-3xl mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-48 bg-gray-300 rounded-3xl"></div>
              </div>
              <div className="h-48 bg-gray-300 rounded-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function TradieProfile({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // Fetch the tradie row first (avoid relational nested select which can break on some schemas)
  const { data: tradie, error: tradieError } = await supabase
    .from("tradies")
    .select("*")
    .eq("id", params.id)
    .single();

  if (tradieError || !tradie) return notFound();

  // Resolve user display name separately to avoid relying on DB nested selects
  let userName: string | null = null;
  try {
    if (tradie.user_id) {
      type MinimalUser = { id: string; name?: string } | null;
      const { data: userData } = (await supabase
        .from("users")
        .select("id, name")
        .eq("id", tradie.user_id)
        .single()) as { data: MinimalUser };
      type UserRow = { id: string; name?: string };
      if (userData && (userData as UserRow).name)
        userName = (userData as UserRow).name as string;
    }
  } catch {
    // swallow — we already have the tradie row; fallback below will show generic label
  }

  const primarySkill = tradie.skills?.[0] || "general";
  const skillIcon = skillIcons[primarySkill] || "🛠️";
  const locationEmoji = locationEmojis[tradie.location] || "📍";
  const isTopTradie = tradie.ratings?.average >= 4.7;

  // Generate star rating
  const fullStars = Math.floor(tradie.ratings?.average || 0);
  const hasHalfStar = (tradie.ratings?.average || 0) % 1 >= 0.5;

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
          <div className="absolute top-1/2 left-3/4 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-8 text-sm text-gray-600 dark:text-gray-400">
              <span className="hover:text-blue-600 cursor-pointer">Home</span>
              <span className="mx-2">→</span>
              <Link href="/client/browse-tradies">
                <span className="hover:text-blue-600 cursor-pointer">
                  Tradies
                </span>
              </Link>
              <span className="mx-2">→</span>
              <span className="text-gray-900 dark:text-white font-medium">
                Profile
              </span>
            </nav>

            {/* Hero Section */}
            <div className="relative mb-12 overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl shadow-2xl dark:bg-gray-900/80 border border-white/20">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>

              {/* Top badges */}
              <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
                {isTopTradie && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-sm font-bold px-4 py-2 rounded-full shadow-lg animate-bounce">
                    ⭐ Top Rated Professional
                  </div>
                )}
                <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-black text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                  ✓ Verified & Insured
                </div>
              </div>

              <div className="relative z-10 p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center text-6xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                      {skillIcon}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-2xl shadow-lg">
                      ✓
                    </div>
                  </div>

                  {/* Main Info */}
                  <div className="flex-1">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent dark:from-white dark:via-blue-200 dark:to-purple-200 mb-2">
                      {primarySkill.replace("_", " ").toUpperCase()} EXPERT
                    </h1>

                    <p className="text-2xl text-gray-800 dark:text-gray-200 font-semibold mb-4">
                      {userName || tradie.user_id || "Tradie"}
                    </p>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2 text-xl">
                        <span className="text-2xl">{locationEmoji}</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {tradie.location}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-lg ${
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
                        <span className="font-bold text-gray-900 dark:text-white">
                          {tradie.ratings?.average || 0}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({tradie.ratings?.count || 0} reviews)
                        </span>
                      </div>
                    </div>

                    <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl">
                      {tradie.bio}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Skills & Certifications */}
              <div className="lg:col-span-2 space-y-8">
                {/* Skills Section */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl dark:bg-gray-900/80 border border-white/20">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                      🎯
                    </span>
                    Core Specialties
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tradie.skills?.map((skill: string) => (
                      <div
                        key={skill}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-100 dark:border-blue-800"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                            {skillIcons[skill] || "🛠️"}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                              {skill.replace("_", " ").toUpperCase()}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Professional Service
                            </p>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certifications Section */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl dark:bg-gray-900/80 border border-white/20">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                      🏆
                    </span>
                    Professional Certifications
                  </h2>

                  <div className="space-y-4">
                    {(
                      Object.entries(tradie.certifications || {}) as [
                        string,
                        string
                      ][]
                    ).map(([key, value]: [string, string]) => (
                      <div
                        key={key}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-green-100 dark:border-green-800"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                            {certificationIcons[key] || "📜"}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                              {key.replace("_", " ").toUpperCase()}
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {value}
                            </p>
                          </div>
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            ✓
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Contact & Actions */}
              <div className="space-y-6">
                {/* Contact Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl dark:bg-gray-900/80 border border-white/20 sticky top-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Get In Touch
                  </h3>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <span className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                        📞
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Call Now
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Available 24/7
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <span className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white">
                        💬
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Message
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Quick response
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      📞 Call Now for Quote
                    </button>

                    <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      💬 Send Message
                    </button>

                    <button className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-4 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300">
                      📅 Schedule Visit
                    </button>

                    {/* Offer button - client component */}
                    <div className="mt-4">
                      <OfferButtonServerWrapper tradieId={tradie.id} />
                    </div>
                  </div>

                  {/* Trust indicators */}
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <span>🛡️</span>
                        <span>Insured</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>✅</span>
                        <span>Verified</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🔒</span>
                        <span>Secure</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}

// add insured to data base
// add the link to book the tradie through app
