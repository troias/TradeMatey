"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TradieCard } from "@/components/TradieCard";
import { toast } from "react-hot-toast";

export default function BrowseTradies() {
  const [tradeFilter, setTradeFilter] = useState("");
  const [tradies, setTradies] = useState<any[]>([]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["tradies", tradeFilter],
    queryFn: async () => {
      const res = await fetch(
        `/api/tradies${tradeFilter ? `?trade=${tradeFilter}` : ""}`
      );
      if (!res.ok) throw new Error("Failed to fetch tradies");
      return res.json();
    },
  });

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
        </select>
      </div>
      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tradies.map((tradie) => (
            <TradieCard
              key={tradie.id}
              tradie={tradie}
              className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            />
          ))}
        </div>
      )}
    </div>
  );
}
