// ── Mentor API — SSE client ──────────────────────────────────────────────────
// Streams responses from kodiq.ai/api/academy/chat (Qwen 3.5 Plus via DashScope).

const API_BASE = import.meta.env.VITE_SUPABASE_URL ? "https://kodiq.ai" : "http://localhost:3002";

export interface StreamCallbacks {
  onToken: (text: string) => void;
  onThinking: (text: string) => void;
  onDone: (usage?: { input: number; output: number }) => void;
  onError: (error: string) => void;
}

export async function sendMentorMessage(
  message: string,
  accessToken: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/academy/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message,
      moduleSlug: "__global__",
      lessonSlug: "mentor",
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;

      try {
        const json = JSON.parse(line.slice(6));
        if (json.thinking) callbacks.onThinking(json.thinking);
        if (json.text) callbacks.onToken(json.text);
        if (json.done) {
          callbacks.onDone(json.usage);
          return;
        }
        if (json.error) {
          callbacks.onError(json.error);
          return;
        }
      } catch {
        // Malformed JSON chunk — skip
      }
    }
  }

  // Stream ended without explicit done event
  callbacks.onDone();
}
