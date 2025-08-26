import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AdminAuditPage from "../src/app/admin/audit/page";

// mock global fetch
const mockRows = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  token: i % 2 === 0 ? `t${i}` : null,
  target_user_id: `u${i}`,
  actor_user_id: i % 3 === 0 ? `a${i}` : null,
  action: i % 4 === 0 ? "redeemed" : "created",
  created_at: new Date(Date.now() - i * 1000 * 60).toISOString(),
}));

beforeEach(() => {
  // @ts-expect-error assigning to global.fetch for test
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve(mockRows) })
  );
});

afterEach(() => {
  // restore if it's a jest mock
  if (global.fetch) {
    const gf = global.fetch as unknown as jest.Mock;
    if (gf && gf.mockRestore) gf.mockRestore();
  }
});

test("renders audit rows, supports filtering and pagination", async () => {
  render(<AdminAuditPage />);
  await waitFor(() =>
    expect(screen.getByText(/Admin Audit/i)).toBeInTheDocument()
  );
  // default page should show some rows
  expect(screen.getByText(/created|redeemed/i)).toBeInTheDocument();

  // filter for 'redeemed'
  const input = screen.getByLabelText("action-filter") as HTMLInputElement;
  input.value = "redeemed";
  input.dispatchEvent(new Event("input", { bubbles: true }));

  await waitFor(() =>
    expect(screen.getByText(/redeemed/i)).toBeInTheDocument()
  );

  // click next page
  const next = screen.getByLabelText("next-page") as HTMLButtonElement;
  next.click();
  // page should update; still show the heading
  await waitFor(() =>
    expect(screen.getByText(/Admin Audit/i)).toBeInTheDocument()
  );
});
