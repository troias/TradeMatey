"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function BookingForm() {
  const { data: session } = useSession();
  const [jobDescription, setJobDescription] = useState("");
  const [location, setLocation] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription,
        location,
        userId: session?.user.id,
      }),
    });
    if (res.ok) router.push("/tradies");
  };

  if (!session) return <p>Please sign in to book</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block">Job Description</label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Submit
      </button>
    </form>
  );
}
