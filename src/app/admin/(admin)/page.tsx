"use client";

import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">
        Welcome to TradeMatey - Admin Portal
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Manage users, disputes, and platform settings.
      </p>
      <div className="space-x-4">
        <Link href="/admin/dashboard">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
