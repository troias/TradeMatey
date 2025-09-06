import React from "react";
import { render, screen } from "@testing-library/react";
import MilestoneBadge from "@/components/MilestoneBadge";

describe("MilestoneBadge", () => {
  it("renders Paid for verified", () => {
    render(<MilestoneBadge status="verified" />);
    expect(screen.getByRole("status")).toHaveTextContent("Paid");
  });

  it("renders Pending for pending", () => {
    render(<MilestoneBadge status="pending" />);
    expect(screen.getByRole("status")).toHaveTextContent("Pending");
  });

  it("renders Current when isCurrent", () => {
    render(<MilestoneBadge isCurrent />);
    expect(screen.getByRole("status")).toHaveTextContent("Current");
  });
});
