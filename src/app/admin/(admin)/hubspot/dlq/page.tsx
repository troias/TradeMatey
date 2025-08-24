"use client";
import React from "react";
import { useEffect, useState } from "react";

export default function HubspotDlqPage() {
  const [items, setItems] = useState<unknown[]>([]);

  useEffect(() => {
    fetch("/api/admin/hubspot/dlq").then(async (r) => {
      const j = await r.json();
      setItems(j.data || []);
    });
  }, []);

  async function requeue(id: string) {
    await fetch("/api/admin/hubspot/dlq/requeue", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    // refresh
    const j = await (await fetch("/api/admin/hubspot/dlq")).json();
    setItems(j.data || []);
  }

  return (
    <div>
      <h1>HubSpot DLQ</h1>
      <ul>
        {items.map((it) => {
          const item = it as Record<string, unknown>;
          return (
            <li key={String(item.id)}>
              {String(item.user_id)} — {String(item.error)} — attempts:{" "}
              {String(item.attempts)}
              <button onClick={() => requeue(String(item.id))}>Requeue</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
