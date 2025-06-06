"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

export default function Availability() {
  const { user } = useAuth();
  const [availability, setAvailability] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
  });

  const handleSave = async () => {
    const res = await fetch("/api/tradies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user?.id, availability }),
    });
    if (res.ok) toast.success("Availability updated!");
    else toast.error("Update failed");
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Set Availability
      </h1>
      <div className="space-y-4">
        {["monday", "tuesday", "wednesday", "thursday", "friday"].map((day) => (
          <label
            key={day}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <input
              type="checkbox"
              checked={availability[day as keyof typeof availability]}
              onChange={(e) =>
                setAvailability({ ...availability, [day]: e.target.checked })
              }
              className="mr-2"
            />
            {day.charAt(0).toUpperCase() + day.slice(1)}
          </label>
        ))}
        <Button onClick={handleSave} className="w-full">
          Save Availability
        </Button>
      </div>
    </div>
  );
}
