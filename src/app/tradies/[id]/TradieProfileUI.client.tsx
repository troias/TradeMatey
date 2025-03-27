// src/app/tradies/[id]/TradieProfileUI.client.tsx
"use client"; // Marks this as a Client Component

import { motion } from "framer-motion"; // If using motion for animations

export default function TradieProfileUI({ tradie }: { tradie: any }) {
  return (
    <div className="mx-auto max-w-3xl p-6 md:p-12 space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white"
      >
        {tradie.name}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-2xl bg-white p-8 shadow-lg transition-shadow hover:shadow-2xl dark:bg-gray-900"
      >
        <div className="space-y-4 text-lg text-gray-700 dark:text-gray-300">
          <p>
            <span className="font-semibold text-gray-900 dark:text-white">
              Trade:
            </span>{" "}
            {tradie.trade}
          </p>
          <p>
            <span className="font-semibold text-gray-900 dark:text-white">
              Location:
            </span>{" "}
            {tradie.location}
          </p>
          <p>
            <span className="font-semibold text-gray-900 dark:text-white">
              About:
            </span>{" "}
            {tradie.bio || "No bio provided"}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex justify-center"
      >
        <a
          href="/book"
          className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white shadow-md transition-transform transform hover:scale-105 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400"
          aria-label="Book this tradie"
        >
          Book This Tradie
        </a>
      </motion.div>
    </div>
  );
}
