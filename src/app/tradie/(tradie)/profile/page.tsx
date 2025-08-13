"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/Providers";

export default function Profile() {
  useAuth(); // ensure auth required; value unused currently
  const [form, setForm] = useState({
    name: "",
    trade: "",
    region: "",
  });

  const handleSave = async () => {
    // Placeholder for updating profile via API
    toast.success("Profile updated!");
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Edit Profile
      </h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Trade
          </label>
          <input
            type="text"
            value={form.trade}
            onChange={(e) => setForm({ ...form, trade: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Region
          </label>
          <input
            type="text"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
