"use client";

import Link from "next/link";

export default function TradieHome() {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">
        Welcome to TradeMatey - Tradie Portal
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Manage your jobs, update availability, and connect with clients.
      </p>
      <div className="space-x-4">
        <Link href="/tradie/dashboard">
          <button className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            Go to Dashboard
          </button>
        </Link>
        <Link href="/tradie/availability">
          <button className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            Update Availability
          </button>
        </Link>
      </div>
    </div>
  );
}
