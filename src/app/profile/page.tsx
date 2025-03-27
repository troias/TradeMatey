"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/db";

export default function ProfileSetup() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("tradies").insert([
      {
        name,
        trade,
        location,
        bio,
        user_id: session?.user.id,
      },
    ]);
    if (!error) {
      await supabase
        .from("profiles")
        .update({ role: "tradie" })
        .eq("id", session?.user.id);
      router.push("/tradies");
    }
  };

  if (!session)
    return (
      <div className="flex h-screen items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-300">
        Please sign in to set up your profile.
      </div>
    );

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-xl transition-shadow hover:shadow-2xl dark:bg-gray-900">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Set Up Your Tradie Profile
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Fill out your details to start receiving job opportunities.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Input Fields */}
        {[
          { label: "Name", value: name, setter: setName },
          { label: "Trade (e.g., Plumber)", value: trade, setter: setTrade },
          { label: "Location", value: location, setter: setLocation },
        ].map(({ label, value, setter }) => (
          <input
            key={label}
            type="text"
            placeholder={label}
            value={value}
            onChange={(e) => setter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
            required
          />
        ))}

        {/* Bio Textarea */}
        <textarea
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full resize-none rounded-lg border border-gray-300 p-3 text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
          rows={4}
        />

        {/* Submit Button */}
        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-blue-600 px-5 py-3 text-lg font-medium text-white transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          Save Profile
        </button>
      </form>
    </div>
  );
}
