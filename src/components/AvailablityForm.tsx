// src/components/AvailabilityForm.tsx
"use client";
import { useState, FormEvent } from "react";
import { toast } from "react-hot-toast";

export default function AvailabilityForm() {
  const [dates, setDates] = useState("");
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(dates);
    } catch {
      toast.error("Invalid JSON");
      return;
    }
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available_dates: parsed }),
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
