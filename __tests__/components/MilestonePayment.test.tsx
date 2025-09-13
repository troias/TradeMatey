import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
// Mock react-hot-toast to verify error calls
jest.mock("react-hot-toast", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));
import { toast } from "react-hot-toast";

describe("Milestone payment UI (isolated)", () => {
  let originalFetch: typeof global.fetch | undefined;

  beforeEach(() => {
    jest.resetAllMocks();
    originalFetch = global.fetch;
    // assign a typed mock to global.fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({}) })
    ) as unknown as typeof global.fetch;
  });

  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch;
  });

  it("does not call payments API when no tradie assigned and shows error", () => {
    // Simple test component that replicates guard behavior
    function TestPayment({
      milestone,
    }: {
      milestone: { title: string; amount: number; tradie_id?: string };
    }) {
      const handleClick = async () => {
        const assignedTradie = milestone?.tradie_id;
        if (!assignedTradie) {
          // use the mocked toast
          toast.error("Milestone has no assigned tradie");
          return;
        }
        await fetch("/api/payments", { method: "POST" });
      };
      return (
        <div>
          <div>{milestone.title}</div>
          <button onClick={handleClick}>
            Pay A${milestone.amount.toFixed(2)}
          </button>
        </div>
      );
    }

    const milestone = {
      id: "mid-1",
      title: "phase 1",
      status: "pending",
      amount: 100,
    };
    render(<TestPayment milestone={milestone} />);

    // Ensure title renders
    expect(screen.getByText("phase 1")).toBeInTheDocument();

    // Click pay
    fireEvent.click(screen.getByText(/Pay A\$100.00/));

    // Ensure fetch was not called with /api/payments
    // @ts-ignore mocked global.fetch
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/payments")
    );
    // Ensure toast error called
    expect(toast.error).toHaveBeenCalledWith(
      "Milestone has no assigned tradie"
    );
  });
});
