import { describe, expect, it } from "vitest";
import { validateAudioBuffer } from "@/lib/voice-qa/audio-validation";

describe("validateAudioBuffer", () => {
  it("accepts an MP3 with a supported extension and MIME type", () => {
    const result = validateAudioBuffer({ filename: "call.mp3", mimeType: "audio/mpeg", size: 4, bytes: new Uint8Array([0x49, 0x44, 0x33, 0x04]) });
    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe("audio/mpeg");
  });

  it("accepts the common browser MIME labels used for M4A files", () => {
    const result = validateAudioBuffer({ filename: "call.m4a", mimeType: "audio/x-m4a", size: 12, bytes: new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]) });
    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe("audio/mp4");
  });

  it("rejects a spoofed extension when the file signature is unsupported", () => {
    const result = validateAudioBuffer({ filename: "call.mp3", mimeType: "audio/mpeg", size: 4, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) });
    expect(result).toEqual({ valid: false, detectedType: null, error: "The file content does not match a supported audio format." });
  });

  it("rejects files larger than the configured limit", () => {
    const result = validateAudioBuffer({ filename: "call.wav", mimeType: "audio/wav", size: 101 * 1024 * 1024, bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]) });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("100 MB");
  });
});
