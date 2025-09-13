import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MilestonePage from "@/app/client/(client)/job/[id]/milestone/[mid]/page";

// Mock next/navigation useRouter
jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));
// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

// Mock @stripe/react-stripe-js to prevent real Stripe usage
jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: any) => <div>{children}</div>,
  useStripe: () => ({ confirmCardPayment: jest.fn() }),
  useElements: () => ({ getElement: () => null }),
  CardElement: () => <input aria-label="card-element" />,
}));

// Mock the Card and Button UI components to avoid heavy UI imports
jest.mock("@/components/ui", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

// Provide a controlled fetch mock
const originalFetch = global.fetch;
beforeEach(() => {
  jest.resetAllMocks();
});
afterEach(() => {
  global.fetch = originalFetch;
});

function setupMilestoneFetch(milestone: Record<string, unknown>) {
  // Mock fetch for milestone and for saved methods
  global.fetch = jest.fn((input: RequestInfo) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
        ? input.url
        : String(input);
    if (url.includes("/api/milestones")) {
      return Promise.resolve({
        ok: true,
        json: async () => milestone,
      } as Response);
    }
    if (url.includes("/api/payments/methods")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ methods: [] }),
      } as Response);
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
  }) as unknown as typeof global.fetch;
}

describe("Integrated milestone page", () => {
  it("hides payment UI and prevents payment when no tradie assigned", async () => {
    const milestone = {
      id: "mid-1",
      title: "phase 1",
      status: "pending",
      amount: 100,
    };
    setupMilestoneFetch(milestone);

    render(<MilestonePage params={{ id: "job-1", mid: "mid-1" }} />);

    await waitFor(() =>
      expect(screen.getByText("phase 1")).toBeInTheDocument()
    );

    // Saved methods not present and tradie missing => payment message should appear
    expect(
      screen.getByText(/Payment options available once a tradie is assigned/)
    ).toBeInTheDocument();

    // There should be no active Pay button rendered (the Card/Button are mocked to simple elements)
    const payButtons = screen.queryAllByRole("button", { name: /Pay A\$/i });
    expect(payButtons.length).toBe(0);
  });

  it("shows tradie info when tradie is assigned and allows payment", async () => {
    const milestone = {
      id: "mid-1",
      title: "phase 1",
      status: "pending",
      amount: 100,
      tradie_id: "tradie-1",
      tradie_name: "Bob The Tradie",
    };
    setupMilestoneFetch(milestone);

    // Mock payments endpoint to assert it is called when tradie exists
    global.fetch = jest.fn((input: RequestInfo) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
          ? input.url
          : String(input);
      if (url.includes("/api/milestones")) {
        return Promise.resolve({
          ok: true,
          json: async () => milestone,
        } as Response);
      }
      if (url.includes("/api/payments")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ clientSecret: "secret" }),
        } as Response);
      }
      if (url.includes("/api/payments/methods")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ methods: [] }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    }) as unknown as typeof global.fetch;

    render(<MilestonePage params={{ id: "job-1", mid: "mid-1" }} />);
    await waitFor(() =>
      expect(screen.getByText("phase 1")).toBeInTheDocument()
    );

    // Tradie info should be displayed (we will add the tradie display in the page if missing)
    expect(screen.getByText(/tradie-1|Bob The Tradie/i)).toBeInTheDocument();

    // There should be a Pay button rendered
    const payButton = screen.getByRole("button", { name: /Pay A\$100.00/i });
    expect(payButton).toBeInTheDocument();
  });
});
