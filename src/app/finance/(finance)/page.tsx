"use client";

import Link from "next/link";

export default function FinanceHome() {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">
        Welcome to TradeMatey - Finance Portal
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Manage payments, escrow, and financial reports.
      </p>
      <div className="space-x-4">
        <Link href="/finance/dashboard">
          <button className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
            Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
