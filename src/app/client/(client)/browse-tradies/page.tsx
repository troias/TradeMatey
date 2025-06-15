"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import TradieCard from "@/components/TradieCard";
import { toast } from "react-hot-toast";

export default function BrowseTradies() {
  const [tradeFilter, setTradeFilter] = useState("");
  const [tradies, setTradies] = useState<any[]>([]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["tradies", tradeFilter],
    queryFn: async () => {
      const url = `/api/tradies${tradeFilter ? `?trade=${tradeFilter}` : ""}`;
      console.log("Fetching:", url);
      const res = await fetch(url, { cache: "no-store" });
      console.log("Response status:", res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API error:", errorText);
        throw new Error(`Failed to fetch tradies: ${res.status} ${errorText}`);
      }
      const json = await res.json();
      console.log("API response:", json);
      return json;
    },
  });

  console.log("Tradies data front end:", data, "Error:", error);

  useEffect(() => {
    if (data) setTradies(data);
    if (error) toast.error(error.message);
  }, [data, error]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Browse Tradies
      </h1>
      <div className="flex space-x-4">
        <select
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          className="px-4 py-2 rounded-md border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Trades</option>
          <option value="carpentry">Carpentry</option>
          <option value="plumbing">Plumbing</option>
          <option value="electrical">Electrical</option>
          <option value="tiling">Tiling</option>
          <option value="painting">Painting</option>
        </select>
      </div>
      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">
          Error: {error.message}
        </div>
      ) : tradies.length === 0 ? (
        <div className="text-center py-10">
          No tradies found for {tradeFilter || "all trades"}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tradies.map((tradie) => (
            <TradieCard key={tradie.id} tradie={tradie} />
          ))}
        </div>
      )}
    </div>
  );
}
