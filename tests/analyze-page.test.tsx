import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import AnalyzePage from "@/app/voice-qa/analyze/page";

describe("analyze page result handoff", () => {
  it("uploads and queues transcription and evaluation from one action", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/agents")) return Promise.resolve({ ok: true, json: async () => ({ agents: [] }) });
      if (url.includes("/templates/list")) return Promise.resolve({ ok: true, json: async () => ({ templates: [{ versionId: "template-v1", name: "Standard QA", versionNumber: 1, active: true }] }) });
      if (url === "/api/voice-qa/calls") return Promise.resolve({ ok: true, json: async () => ({ id: "call-123", status: "UPLOADED" }) });
      return Promise.resolve({ ok: true, json: async () => ({ id: "job-123", status: "QUEUED" }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AnalyzePage />);
    await waitFor(() => expect(screen.getByRole("option", { name: /standard qa/i })).toBeInTheDocument());
    const file = new File(["audio"], "call.mp3", { type: "audio/mpeg" });
    fireEvent.change(screen.getByLabelText(/drop an audio recording here/i), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/qa template/i), { target: { value: "template-v1" } });
    await waitFor(() => expect(screen.getByLabelText(/qa template/i)).toHaveValue("template-v1"));
    fireEvent.submit(screen.getByRole("button", { name: /transcribe & evaluate/i }).closest("form")!);

    expect(await screen.findByRole("link", { name: /open call review/i })).toHaveAttribute("href", "/voice-qa/calls/call-123");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/voice-qa/calls/call-123/analyze", expect.objectContaining({ method: "POST" })));
    expect(screen.queryByRole("button", { name: /start transcription analysis/i })).not.toBeInTheDocument();
  });
});
