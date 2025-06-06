"use client";

import Link from "next/link";

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Upgrade to TradeMatey Premium
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Unlock advanced tools and features with our premium subscription,
          backed by a $1M investment for top-tier service.
        </p>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Premium Benefits
          </h2>
          <ul className="mt-4 space-y-2 text-left text-gray-600 dark:text-gray-400">
            <li>✔ Advanced Job Analytics</li>
            <li>✔ Automated Invoicing</li>
            <li>✔ Marketing Tools</li>
            <li>✔ Priority Support</li>
          </ul>
          <p className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Starting at $19.99/month
          </p>
          <Link href="/tradie/subscribe">
            <button className="mt-6 px-8 py-3 bg-yellow-400 text-blue-900 rounded-lg shadow-md hover:bg-yellow-500 transition transform hover:scale-105">
              Subscribe Now
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
