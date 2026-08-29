import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { DashboardOverview } from "@/components/voice-qa/dashboard-overview";

describe("dashboard recording table", () => {
  it("keeps row navigation separate from recording actions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ calls: [{ id: "call-1", status: "UPLOADED", verdict: null, overall_score: null, original_filename: "New Recording 10.m4a", created_at: "2026-08-29T10:21:00Z" }] }),
    }));

    render(<DashboardOverview />);
    expect(await screen.findByText("New Recording 10.m4a")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete recording" }).closest("a")).toBeNull());
  });
});
