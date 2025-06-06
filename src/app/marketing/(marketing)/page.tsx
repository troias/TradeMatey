"use client";

import Link from "next/link";

export default function MarketingHome() {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">
        Welcome to TradeMatey - Marketing Portal
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Manage campaigns, referrals, and promotions.
      </p>
      <div className="space-x-4">
        <Link href="/marketing/dashboard">
          <button className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors">
            Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
