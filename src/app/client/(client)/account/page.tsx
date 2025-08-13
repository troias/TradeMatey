"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

type AccountData = {
  email: string;
  createdAt?: string;
  region?: string | null;
  roles: string[];
  primaryRole?: string | null;
  serviceType?: string | null;
  badgesCount: number;
  unreadNotifications: number;
};

export default function AccountPage() {
  const supabase = createClient();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regionEdit, setRegionEdit] = useState<string>("");
  const [serviceTypeIdEdit, setServiceTypeIdEdit] = useState<number | null>(
    null
  );
  const [serviceTypes, setServiceTypes] = useState<
    Array<{ id: number; name: string }>
  >([]);

  // Helper to load account details and service types
  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setLoading(false);
        return;
      }

      const email = user.email ?? "";
      const createdAt = user.created_at ?? undefined;

      // Users table fields (region, roles array)
      const { data: userRow } = await supabase
        .from("users")
        .select("region, roles")
        .eq("id", user.id)
        .maybeSingle();

      // Profiles primary role
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      // User roles table
      const { data: userRolesRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      // Client service type id
      const { data: clientRow } = await supabase
        .from("clients")
        .select("service_type_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const currentServiceTypeId = clientRow?.service_type_id ?? null;

      // Service types list for editing
      const { data: svcTypes } = await supabase
        .from("service_types")
        .select("id, name")
        .order("name", { ascending: true });
      setServiceTypes(svcTypes ?? []);

      let serviceType: string | null = null;
      if (currentServiceTypeId != null) {
        const svc = (svcTypes ?? []).find((s) => s.id === currentServiceTypeId);
        serviceType = svc?.name ?? null;
      }

      // Counts
      const { count: badgesCountRaw } = await supabase
        .from("badges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const badgesCount = badgesCountRaw ?? 0;

      const { count: unreadNotificationsRaw } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      const unreadNotifications = unreadNotificationsRaw ?? 0;

      const rolesFromUsers = Array.isArray(userRow?.roles)
        ? (userRow?.roles as string[])
        : [];
      const rolesFromUserRoles = Array.isArray(userRolesRows)
        ? userRolesRows.map((r) => r.role as string)
        : [];
      const mergedRoles = Array.from(
        new Set([...(rolesFromUsers || []), ...(rolesFromUserRoles || [])])
      );

      const primaryRole = profileRow?.role ?? mergedRoles[0] ?? null;

      setData({
        email,
        createdAt,
        region: userRow?.region ?? null,
        roles: mergedRoles,
        primaryRole,
        serviceType,
        badgesCount,
        unreadNotifications,
      });

      // Initialize edit fields with current values
      setRegionEdit(userRow?.region ?? "");
      setServiceTypeIdEdit(currentServiceTypeId);
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to load account details";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      // Update region if changed
      if ((data?.region ?? "") !== regionEdit) {
        const { error: regionError } = await supabase
          .from("users")
          .update({ region: regionEdit })
          .eq("id", user.id);
        if (regionError) throw regionError;
      }

      // Update client service type
      if (serviceTypeIdEdit !== undefined) {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingClient) {
          const { error: clientUpdateError } = await supabase
            .from("clients")
            .update({ service_type_id: serviceTypeIdEdit })
            .eq("user_id", user.id);
          if (clientUpdateError) throw clientUpdateError;
        } else if (serviceTypeIdEdit != null) {
          const { error: clientInsertError } = await supabase
            .from("clients")
            .insert({ user_id: user.id, service_type_id: serviceTypeIdEdit });
          if (clientInsertError) throw clientInsertError;
        }
      }

      toast.success("Account details updated");
      setEditing(false);
      await fetchAccountData();
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to save details";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Your Account</h1>
      <p className="mb-6 text-gray-600">
        Overview of your profile and account settings.
      </p>

      {loading ? (
        <div className="text-sm text-gray-500">Loading account details…</div>
      ) : !data ? (
        <div className="text-sm text-red-600">No account data available.</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border p-4 bg-white">
            <h2 className="font-semibold mb-3">Account Overview</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900 break-all">{data.email}</dd>
              </div>
              {data.createdAt && (
                <div>
                  <dt className="text-gray-500">Joined</dt>
                  <dd className="text-gray-900">
                    {new Date(data.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Primary Role</dt>
                <dd className="text-gray-900">{data.primaryRole ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">All Roles</dt>
                <dd className="text-gray-900">
                  {data.roles.length ? data.roles.join(", ") : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Region</dt>
                <dd className="text-gray-900">{data.region ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Service Type</dt>
                <dd className="text-gray-900">{data.serviceType ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Badges</dt>
                <dd className="text-gray-900">{data.badgesCount}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Unread Notifications</dt>
                <dd className="text-gray-900">{data.unreadNotifications}</dd>
              </div>
            </dl>
          </div>

          {/* Edit details */}
          <div className="rounded-lg border p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Edit Details</h2>
              {!editing ? (
                <Button onClick={() => setEditing(true)}>Edit</Button>
              ) : null}
            </div>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={regionEdit}
                    onChange={(e) => setRegionEdit(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="e.g., Regional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type
                  </label>
                  <select
                    value={serviceTypeIdEdit ?? ""}
                    onChange={(e) =>
                      setServiceTypeIdEdit(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full p-2 border rounded-md bg-white text-gray-900"
                  >
                    <option value="">Select service type</option>
                    {serviceTypes.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    isLoading={saving}
                    disabled={saving}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      // Reset edits to current data
                      setRegionEdit(data.region ?? "");
                      const st = serviceTypes.find(
                        (s) => s.name === data.serviceType
                      );
                      setServiceTypeIdEdit(st?.id ?? null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Update your region and service type.
              </p>
            )}
          </div>

          <div className="rounded-lg border p-4 bg-white">
            <h2 className="font-semibold mb-3">Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/client/settings" passHref>
                <Button>Go to Settings</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
