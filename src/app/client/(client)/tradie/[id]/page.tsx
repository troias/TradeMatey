"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export default function TradieProfile({ params }: { params: { id: string } }) {
  const [tradie, setTradie] = useState<any>(null);

  const { data, error, isLoading } = useQuery({
    queryKey: ["tradie", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/tradies?user_id=${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch tradie");
      return res.json();
    },
  });

  useEffect(() => {
    if (data && data.length > 0) setTradie(data[0]);
    if (error) toast.error(error.message);
  }, [data, error]);

  if (isLoading) return <div className="text-center py-10">Loading...</div>;
  if (!tradie) return <div className="text-center py-10">Tradie not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {tradie.name}
      </h1>
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <p className="text-gray-600 dark:text-gray-400">
          Trade: {tradie.trade}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Rating: {tradie.average_rating || "N/A"}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Region: {tradie.region}
        </p>
        {tradie.top_tradie && (
          <p className="text-green-600 dark:text-green-400">Top Tradie ✅</p>
        )}
        <button
          onClick={() => alert("Contact functionality coming soon!")}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Contact Tradie
        </button>
      </div>
    </div>
  );
}
