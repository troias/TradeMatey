"use client";
import React, { useState } from "react";

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [status, setStatus] = useState<string | null>(null);

  async function sendInvite() {
    setStatus("sending");
    const res = await fetch("/api/admin/team/invite", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
    if (res.ok) setStatus("sent");
    else setStatus("error");
  }

  return (
    <div>
      <h2>Invite team member</h2>
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="employee">Employee</option>
        <option value="admin">Admin</option>
      </select>
      <button onClick={sendInvite}>Send invite</button>
      <div>{status}</div>
    </div>
  );
}
