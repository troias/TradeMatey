// src/components/BadgeList.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
export default function BadgeList() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const res = await fetch("/api/badges");
      if (!res.ok) throw new Error("Failed to fetch badges");
      return res.json();
    },
  });
  if (isLoading) return <p>Loading...</p>;
  if (error) toast.error(error.message);
  return (
    <div>
      <h2>Your Badges</h2>
      {data.map((badge) => (
        <p key={badge.id}>
          {badge.badge} (Earned:{" "}
          {new Date(badge.earned_at).toLocaleDateString()})
        </p>
      ))}
    </div>
  );
}
