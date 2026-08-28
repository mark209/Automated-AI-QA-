import OpenAI, { toFile } from "openai";

export type TranscriptResult = {
  model: string;
  text: string;
  language?: string;
  durationSeconds?: number;
  segments: Array<{ speaker: string; startSeconds: number; endSeconds: number; text: string }>;
};

export async function transcribeAudio(input: { buffer: Uint8Array; filename: string; mimeType: string; model?: string }): Promise<TranscriptResult> {
  const model = input.model ?? process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-transcribe-diarize";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const file = await toFile(input.buffer, input.filename, { type: input.mimeType });
  const response = await openai.audio.transcriptions.create({
    file,
    model,
    response_format: "diarized_json",
    chunking_strategy: "auto",
  } as unknown as Parameters<typeof openai.audio.transcriptions.create>[0]);
  const diarized = response as unknown as { text?: string; language?: string; duration?: number; segments?: Array<{ speaker?: string; start?: number; end?: number; text?: string }> };
  return {
    model,
    text: diarized.text ?? "",
    language: diarized.language,
    durationSeconds: diarized.duration,
    segments: (diarized.segments ?? []).map((segment) => ({ speaker: segment.speaker ?? "unknown", startSeconds: Number(segment.start ?? 0), endSeconds: Number(segment.end ?? 0), text: segment.text ?? "" })),
  };
}
