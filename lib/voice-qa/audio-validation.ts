const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
const supportedExtensions = new Set([".mp3", ".wav", ".m4a"]);

type AudioValidationInput = {
  filename: string;
  mimeType: string;
  size: number;
  bytes: Uint8Array;
};

export type AudioValidationResult = {
  valid: boolean;
  detectedType: "audio/mpeg" | "audio/wav" | "audio/mp4" | null;
  error?: string;
};

export function validateAudioBuffer(input: AudioValidationInput): AudioValidationResult {
  if (input.size <= 0) return invalid("The audio file is empty.");
  if (input.size > MAX_AUDIO_SIZE) return invalid("Audio files must be 100 MB or smaller.");

  const extension = input.filename.slice(input.filename.lastIndexOf(".")).toLowerCase();
  if (!supportedExtensions.has(extension)) return invalid("Only MP3, WAV, and M4A files are supported.");

  const detectedType = detectAudioType(input.bytes);
  if (!detectedType) return invalid("The file content does not match a supported audio format.");

  const expectedType = extension === ".mp3" ? "audio/mpeg" : extension === ".wav" ? "audio/wav" : "audio/mp4";
  if (expectedType !== detectedType) return invalid("The file extension does not match its audio format.");

  const allowedMimeTypes = extension === ".m4a"
    ? new Set(["audio/mp4", "audio/x-m4a", "audio/m4a", "application/mp4", "application/octet-stream"])
    : new Set([expectedType, "application/octet-stream"]);
  if (input.mimeType && !allowedMimeTypes.has(input.mimeType.toLowerCase())) return invalid("The uploaded MIME type does not match the audio format.");

  return { valid: true, detectedType };
}

function detectAudioType(bytes: Uint8Array): AudioValidationResult["detectedType"] {
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return "audio/mpeg";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WAVE") return "audio/wav";
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") return "audio/mp4";
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function invalid(error: string): AudioValidationResult {
  return { valid: false, detectedType: null, error };
}
