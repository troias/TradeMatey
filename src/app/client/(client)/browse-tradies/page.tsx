"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import TradieCard, { Tradie } from "@/components/TradieCard";
import { toast } from "react-hot-toast";

export default function BrowseTradies() {
  const [tradeFilter, setTradeFilter] = useState("");
  const [tradies, setTradies] = useState<Tradie[]>([]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["tradies", tradeFilter],
    queryFn: async () => {
      const url = `/api/tradies${tradeFilter ? `?trade=${tradeFilter}` : ""}`;
      console.log("Fetching:", url);
      const res = await fetch(url, { cache: "no-store" });
      console.log("Response status:", res.status);
      if (!res.ok) {
        // Read raw text first so we can log exact server response even if it's empty or `{}`
        const raw = await res.text().catch(() => "");
        let parsed: unknown = null;
        if (raw) {
          try {
            parsed = JSON.parse(raw);
          } catch {
            // not JSON, keep raw
          }
        }

        // If parsed is an empty object or the raw body is simply "{}", treat as empty
        const isEmptyObject =
          parsed &&
          typeof parsed === "object" &&
          Object.keys(parsed as Record<string, unknown>).length === 0;
        const isRawEmptyObject = raw && raw.trim() === "{}";
        const errorBody =
          isEmptyObject || isRawEmptyObject ? null : parsed ?? raw ?? null;
        // Log both raw and parsed for debugging, but show parsed in UI when available
        console.error("API error (raw body):", raw);
        console.error("API error (parsed):", parsed);
        const message =
          errorBody == null
            ? `${res.status} ${res.statusText || "(no body)"}`
            : typeof errorBody === "string"
            ? errorBody
            : JSON.stringify(errorBody);
        throw new Error(`Failed to fetch tradies: ${message}`);
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 m-4">
        Browse Tradies
      </h1>
      <div className="flex space-x-4">
        <label htmlFor="trade-filter" className="sr-only">
          Filter by trade
        </label>
        <select
          value={tradeFilter}
          id="trade-filter"
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
