// src/components/BookingForm.tsx
"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
export default function BookingForm() {
  const { data: session } = useSession();
  const [form, setForm] = useState({
    job_description: "",
    location: "",
    job_cost: "",
    is_regional: false,
  });
  const router = useRouter();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, job_cost: Number(form.job_cost) }),
    });
    if (res.ok) {
      toast.success("Booking created!");
      router.push("/client/dashboard");
    } else toast.error("Failed to book");
  };
  if (!session) return <p>Please sign in to book</p>;
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Job Description</label>
        <textarea
          value={form.job_description}
          onChange={(e) =>
            setForm({ ...form, job_description: e.target.value })
          }
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label>Location</label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label>Job Cost (A$)</label>
        <input
          type="number"
          value={form.job_cost}
          onChange={(e) => setForm({ ...form, job_cost: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={form.is_regional}
            onChange={(e) =>
              setForm({ ...form, is_regional: e.target.checked })
            }
          />
          Regional Queensland (A$25 commission cap)
        </label>
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
