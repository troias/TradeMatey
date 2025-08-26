"use client";
import { useEffect, useState } from "react";

type AuditRow = {
  id: string;
  token: string | null;
  target_user_id: string | null;
  actor_user_id: string | null;
  action: string;
  created_at: string;
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const pageSize = 5;

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((body) => {
        if (!mounted) return;
        const isRowsArray = Array.isArray(body);
        const hasRowsField =
          body &&
          typeof body === "object" &&
          "rows" in (body as Record<string, unknown>);
        if (isRowsArray) setRows(body as AuditRow[]);
        else if (hasRowsField)
          setRows((body as Record<string, unknown>).rows as AuditRow[]);
        else setError("Unexpected response from server");
      })
      .catch(() => setError("Failed to load admin audit"));
    return () => {
      mounted = false;
    };
  }, []);

  if (error)
    return <p className="text-red-500">Error loading audit: {error}</p>;
  if (!rows) return <p>Loading admin audit...</p>;

  const filtered = rows.filter((r) =>
    actionFilter
      ? r.action.toLowerCase().includes(actionFilter.toLowerCase())
      : true
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Admin Audit</h2>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm">Filter action:</label>
        <input
          aria-label="action-filter"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          className="border px-2 py-1"
        />
        <div className="ml-auto text-sm">
          Page {page + 1} of {pageCount}
        </div>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="p-2">When</th>
            <th className="p-2">Action</th>
            <th className="p-2">Actor</th>
            <th className="p-2">Target</th>
            <th className="p-2">Token</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-2">{r.action}</td>
              <td className="p-2">{r.actor_user_id || "-"}</td>
              <td className="p-2">{r.target_user_id || "-"}</td>
              <td className="p-2">{r.token || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex gap-2">
        <button
          aria-label="prev-page"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1 border"
        >
          Prev
        </button>
        <button
          aria-label="next-page"
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={page >= pageCount - 1}
          className="px-3 py-1 border"
        >
          Next
        </button>
      </div>
    </div>
  );
}
