"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/Providers";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export default function TradieReferrals() {
  const { user } = useAuth();
  const [referralLink, setReferralLink] = useState("");
  const [credits, setCredits] = useState(0);

  const { data, error, isLoading } = useQuery({
    queryKey: ["tradieReferrals", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/referrals?user_id=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch referral data");
      return res.json();
    },
  });

  useEffect(() => {
    if (data) {
      setCredits(data.credits || 0);
      setReferralLink(
        `${window.location.origin}/tradie/signup?ref=${user?.id}`
      );
    }
    if (error) toast.error(error.message);
  }, [data, error, user?.id]);

  const handleInvite = async () => {
    const res = await fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referrer_id: user?.id,
        referred_user_id: undefined,
        role: "tradie",
      }),
    });
    if (res.ok) {
      toast.success("Referral recorded! Earn $50 when they complete a job.");
    } else {
      toast.error("Referral failed");
    }
  };

  if (isLoading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6 max-w-md mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Tradie Referrals
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Invite tradies and earn $50 credit when they complete their first job!
      </p>
      <p className="text-gray-800 dark:text-gray-200 font-semibold">
        Your Credits: ${credits}
      </p>
      <div className="space-y-4">
        <input
          type="text"
          value={referralLink}
          readOnly
          className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 p-2"
        />
        <button
          onClick={() => navigator.clipboard.writeText(referralLink)}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Copy Referral Link
        </button>
        <div>
          <input
            type="text"
            placeholder="Enter referred tradie ID"
            onChange={(e) => handleInvite(e.target.value)}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white p-2"
          />
        </div>
      </div>
    </div>
  );
}
