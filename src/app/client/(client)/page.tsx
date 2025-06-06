"use client";

import Link from "next/link";

export default function ClientHome() {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">
        Welcome to TradeMatey - Client Portal
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Manage your projects, hire vetted tradies, and track payments.
      </p>
      <div className="space-x-4">
        <Link href="/client/dashboard">
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
            Go to Dashboard
          </button>
        </Link>
        <Link href="/client/post-job">
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
            Post a Job
          </button>
        </Link>
      </div>
    </div>
  );
}
