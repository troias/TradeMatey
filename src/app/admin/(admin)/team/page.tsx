"use client";
import React, { useEffect, useState } from "react";

export default function TeamPage() {
  // invitations state is not yet used; prefix with underscore to satisfy lint until implemented
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_invitations, _setInvitations] = useState<unknown[]>([]);
  const [audit, setAudit] = useState<unknown[]>([]);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => setAudit(d || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2>Team</h2>
      <a href="/admin/team/invite">Invite</a>
      <h3>Audit</h3>
      <ul>
        {audit.map((a, i) => (
          <li key={i}>
            {a.table_name} {a.action} {a.created_at}
          </li>
        ))}
      </ul>
    </div>
  );
}
