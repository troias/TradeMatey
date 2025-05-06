"use client"; // Add this at the top

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/db";

// Reusable Input Component
const InputField = ({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  required?: boolean;
  type?: string;
}) => (
  <div className="flex flex-col space-y-2">
    <label className="text-lg font-medium text-gray-900 dark:text-white">
      {label}
    </label>
    {type === "textarea" ? (
      <textarea
        placeholder={label}
        value={value}
        onChange={onChange}
        className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
        rows={4}
        required={required}
      />
    ) : (
      <input
        type={type}
        placeholder={label}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-lg text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
        required={required}
      />
    )}
  </div>
);

export default function ProfileSetup() {
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [preferences, setPreferences] = useState(""); // Client preferences
  const [serviceTypes, setServiceTypes] = useState<string[]>([]); // To store service types
  const [serviceType, setServiceType] = useState(""); // Service type dropdown
  const [timeframe, setTimeframe] = useState(""); // Timeframe dropdown
  const [specialRequirements, setSpecialRequirements] = useState<string[]>([]); // Special requirements checkboxes
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch service types from the database when the component mounts
  useEffect(() => {
    const fetchServiceTypes = async () => {
      const { data, error } = await supabase
        .from("service_types")
        .select("name"); // Ensure you are selecting the 'name' column here

      if (error) {
        console.error("Error fetching service types:", error.message);
      } else {
        setServiceTypes(data.map((service) => service.name)); // Populate serviceTypes state with 'name'
      }
    };

    fetchServiceTypes();
  }, []);

  // Check if session exists and if role is assigned
  const isUserReady = session?.user && session?.user.role;

  // Function to handle insertion based on role
  const insertData = async () => {
    const { user } = session!;

    try {
      let insertResult;

      if (user.role === "tradie") {
        insertResult = await supabase.from("tradies").insert([
          {
            name,
            trade,
            location,
            bio,
            user_id: user.id,
          },
        ]);
        if (insertResult.error) throw insertResult.error;

        await supabase
          .from("profiles")
          .update({ role: "tradie" })
          .eq("id", user.id);
        router.push("/tradies");
      } else if (user.role === "client") {
        insertResult = await supabase.from("clients").insert([
          {
            name,
            location,
            preferences: JSON.stringify({
              serviceType,
              timeframe,
              specialRequirements,
            }), // Save preferences as a JSON object
            user_id: user.id,
          },
        ]);
        if (insertResult.error) throw insertResult.error;

        await supabase
          .from("profiles")
          .update({ role: "client" })
          .eq("id", user.id);
        router.push("/clients");
      }
    } catch (error) {
      console.error("Error inserting data:", error);
      alert("There was an error saving your profile. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await insertData();
    setLoading(false);
  };

  if (status === "loading" || !isUserReady) {
    return (
      <div className="flex h-screen items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-300">
        Please sign in to set up your profile.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-10 shadow-2xl transition-shadow hover:shadow-xl dark:bg-gray-900">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
        Set Up Your Profile
      </h1>
      <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
        Complete your details to get started with ease.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <InputField
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {session?.user.role === "tradie" && (
          <>
            <InputField
              label="Trade (e.g., Plumber)"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              required
            />
            <InputField
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <InputField
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              type="textarea"
            />
          </>
        )}

        {session?.user.role === "client" && (
          <>
            <InputField
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            {/* Service Type Dropdown */}
            <div className="flex flex-col space-y-2">
              <label className="text-lg font-medium text-gray-900 dark:text-white">
                Service Type
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-lg text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
                required
              >
                <option value="">Select Service Type</option>
                {serviceTypes.map((type, index) => (
                  <option key={index} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Dropdown */}
            <div className="flex flex-col space-y-2">
              <label className="text-lg font-medium text-gray-900 dark:text-white">
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-lg text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
                required
              >
                <option value="">Select Timeframe</option>
                <option value="ASAP">ASAP</option>
                <option value="Within a week">Within a Week</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>

            {/* Special Requirements Checkboxes */}
            <div className="mt-4">
              <label className="text-lg font-medium text-gray-900 dark:text-white">
                Special Requirements
              </label>
              <div className="flex space-x-6 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value="Eco-friendly"
                    onChange={(e) =>
                      setSpecialRequirements((prev) =>
                        e.target.checked
                          ? [...prev, e.target.value]
                          : prev.filter((item) => item !== e.target.value)
                      )
                    }
                  />
                  <span>Eco-friendly</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value="Licensed"
                    onChange={(e) =>
                      setSpecialRequirements((prev) =>
                        e.target.checked
                          ? [...prev, e.target.value]
                          : prev.filter((item) => item !== e.target.value)
                      )
                    }
                  />
                  <span>Licensed Professional</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value="Emergency"
                    onChange={(e) =>
                      setSpecialRequirements((prev) =>
                        e.target.checked
                          ? [...prev, e.target.value]
                          : prev.filter((item) => item !== e.target.value)
                      )
                    }
                  />
                  <span>Emergency Service</span>
                </label>
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-4 text-xl font-semibold text-white transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
