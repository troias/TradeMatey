"use client";
import React from "react";
import { useEffect, useState } from "react";

export default function HubspotInstallsPage() {
  const [installs, setInstalls] = useState<unknown[]>([]);

  useEffect(() => {
    fetch("/api/admin/hubspot/installs").then(async (r) => {
      const j = await r.json();
      setInstalls(j.data || []);
    });
  }, []);

  return (
    <div>
      <h1>HubSpot Installs</h1>
      <ul>
        {installs.map((i) => {
          const item = i as Record<string, unknown>;
          return (
            <li key={String(item.id)}>
              {String(item.portal_id)} — {String(item.created_at)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
