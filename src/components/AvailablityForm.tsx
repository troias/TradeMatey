// src/components/AvailabilityForm.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
export default function AvailabilityForm() {
  const [dates, setDates] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available_dates: JSON.parse(dates) }),
    });
    if (res.ok) toast.success("Availability updated!");
    else toast.error("Failed to update");
  };
  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={dates}
        onChange={(e) => setDates(e.target.value)}
        placeholder='{"dates": ["2025-06-05", "2025-06-06"]}'
      />
      <button type="submit">Update Availability</button>
    </form>
  );
}
