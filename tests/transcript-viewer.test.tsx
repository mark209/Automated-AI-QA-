import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TranscriptViewer } from "@/components/voice-qa/transcript-viewer";

describe("transcript viewer", () => {
  it("collapses long transcript segments until selected", () => {
    const text = "A long transcript segment that contains enough detail to be collapsed in the review interface while preserving the timestamp and speaker context for the reviewer.";
    render(<TranscriptViewer segments={[{ id: "segment-1", speaker: "A", start_seconds: 0, end_seconds: 8, text, sort_order: 0 }]} />);

    expect(screen.queryByText(text)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /expand segment at 00:00/i }));
    expect(screen.getByText(text)).toBeVisible();
  });
});
