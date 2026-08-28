import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import AnalyzePage from "@/app/voice-qa/analyze/page";

describe("analyze page result handoff", () => {
  it("shows a link to the call review after upload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "call-123", status: "UPLOADED" }),
    }));

    render(<AnalyzePage />);
    const file = new File(["audio"], "call.mp3", { type: "audio/mpeg" });
    fireEvent.change(screen.getByLabelText(/drop an audio recording here/i), { target: { files: [file] } });
    fireEvent.submit(screen.getByRole("button", { name: /upload recording/i }).closest("form")!);

    expect(await screen.findByRole("link", { name: /open call review/i })).toHaveAttribute("href", "/voice-qa/calls/call-123");
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/voice-qa/calls", expect.objectContaining({ method: "POST" })));
  });
});
