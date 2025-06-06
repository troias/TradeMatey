"use client";

import Link from "next/link";

export default function SupportHome() {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">
        Welcome to TradeMatey - Support Portal
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Assist users, manage tickets, and resolve issues.
      </p>
      <div className="space-x-4">
        <Link href="/support/dashboard">
          <button className="px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors">
            Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
