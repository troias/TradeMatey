"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import OfferModal from "@/components/OfferModal";
import { createClient } from "@/lib/supabase/client";
// import type { Tradie } from "@/lib/types";

declare global {
  interface Window {
    __E2E_AUTH?: { userId?: string };
  }
}

// Local tradie type containing fields used by this page
type TradieFull = {
  id: string;
  name?: string;
  trade?: string;
  location?: string;
  bio?: string;
  average_rating?: number;
  top_tradie?: boolean;
  region?: string;
};

export default function TradieProfile({ params }: { params: Record<string, unknown> }) {
  const [tradie, setTradie] = useState<TradieFull | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  // Extract id from the current pathname in client runtime to avoid accessing
  // `params` directly (which may be a Promise proxy in some Next versions).
  const pathname = usePathname();
  const idFromPath = pathname?.split("/").filter(Boolean).pop();
  const routeId = (idFromPath as string) || (params && (params as { id?: string }).id);

  const { data, error, isLoading } = useQuery({
    queryKey: ["tradie", routeId],
    queryFn: async () => {
      if (!routeId) throw new Error("Missing tradie id");
  const res = await fetch(`/api/tradies?id=${routeId}`);
      if (!res.ok) throw new Error("Failed to fetch tradie");
      return res.json();
    },
  });

  useEffect(() => {
    if (data && data.length > 0) setTradie(data[0]);
    if (error) toast.error(error.message);
  }, [data, error]);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!mounted) return;
        if (userData?.user) setClientId(userData.user.id);
        else if (typeof window !== "undefined" && window.__E2E_AUTH?.userId)
          setClientId(window.__E2E_AUTH.userId || null);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) return <div className="text-center py-10">Loading...</div>;
  if (!tradie) return <div className="text-center py-10">Tradie not found</div>;

  return (
    <>
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
          onClick={() => setShowOffer(true)}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Contact Tradie
        </button>
      </div>
      </div>
      {showOffer && tradie?.id && (
        <OfferModal
          tradieId={tradie.id}
          clientId={clientId}
          onClose={() => setShowOffer(false)}
        />
      )}
    </>
  );
}
