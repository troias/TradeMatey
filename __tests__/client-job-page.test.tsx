import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Mock the Supabase browser client used by the component to avoid env var requirements
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

import JobDetails from "@/app/client/(client)/job/[id]/page";

// local minimal types for the test
type Interest = {
  id: string;
  tradie_id?: string | null;
  status?: string | null;
  accepted_at?: string | null;
  milestone_id?: string | null;
};
type Milestone = {
  id: string;
  title: string;
  amount?: number;
  created_at?: string | null;
};
type JobRow = {
  id: string;
  title: string;
  description?: string;
  budget?: number;
  status?: string;
  payment_type?: string;
  created_at?: string | null;
  milestones?: Milestone[];
  _meta?: { interests?: Interest[] };
};

// Provide a minimal mock for next/link used in the component
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href?: string;
  }) => <a href={href}>{children}</a>,
}));

describe("JobDetails component", () => {
  beforeEach(() => {
    // Mock fetch to return a single job row with _meta.interests
    const mockJob: JobRow = {
      id: "job-1",
      title: "Test Job",
      description: "Desc",
      budget: 100,
      status: "open",
      payment_type: "milestone",
      created_at: "2025-09-10T12:00:00.000Z",
      milestones: [
        {
          id: "m1",
          title: "Phase 1",
          amount: 50,
          created_at: "2025-09-11T09:00:00.000Z",
        },
      ],
      _meta: {
        interests: [
          {
            id: "i1",
            tradie_id: "t1",
            status: "accepted",
            accepted_at: "2025-09-12T15:00:00.000Z",
            milestone_id: "m1",
          },
        ],
      },
    };

    const mockFetch = jest.fn(async (url: string) => {
      if (url.startsWith("/api/jobs")) {
        return {
          ok: true,
          json: async () => [mockJob],
        } as Response & { json: () => Promise<JobRow[]> };
      }
      return { ok: true, json: async () => ({}) } as Response & {
        json: () => Promise<Record<string, unknown>>;
      };
    });

    // assign typed mock to global.fetch
    // @ts-expect-error Jest runtime assignment
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders Posted, Milestone Created and Assigned timestamps", async () => {
    // Provide a QueryClient to satisfy useQuery
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    render(<JobDetails params={{ id: "job-1" }} />, { wrapper: Wrapper });

    // Wait for fetch and component to update
    await waitFor(() =>
      expect(screen.getByText("Test Job")).toBeInTheDocument()
    );

    expect(screen.getByText(/Posted:/)).toBeInTheDocument();
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Assigned:/)).toBeInTheDocument();
  });
});
