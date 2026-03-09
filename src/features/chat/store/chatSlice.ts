// ── Chat Slice — AI Mentor ──────────────────────────────────────────────────
// Web API chat via kodiq.ai/api/academy/chat. Local DB for history cache.

import type { StateCreator } from "zustand";
import type { ChatMessage } from "@shared/lib/types";
import { chat } from "@shared/lib/tauri";
import { getSession } from "@shared/lib/supabase";
import { sendMentorMessage } from "../lib/mentorApi";

export interface ChatSlice {
  // State
  chatMessages: ChatMessage[];
  chatStreaming: boolean;
  chatStreamingContent: string;
  chatThinkingContent: string;
  chatError: string | null;

  // Actions
  chatSendMessage: (prompt: string, projectId: string) => Promise<void>;
  chatStopStreaming: () => void;
  chatLoadHistory: (projectId: string) => Promise<void>;
  chatClearHistory: (projectId: string) => Promise<void>;
}

// AbortController lives outside store to avoid serialization issues
let abortController: AbortController | null = null;

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set, get) => ({
  chatMessages: [],
  chatStreaming: false,
  chatStreamingContent: "",
  chatThinkingContent: "",
  chatError: null,

  chatSendMessage: async (prompt, projectId) => {
    // Get auth token
    const { session } = await getSession();
    if (!session?.access_token) {
      set({ chatError: "mentorSignInRequired" });
      return;
    }

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: projectId,
      role: "user",
      content: prompt,
      provider: "mentor",
      created_at: Date.now(),
    };

    set((s) => ({
      chatMessages: [...s.chatMessages, userMsg],
      chatStreaming: true,
      chatStreamingContent: "",
      chatThinkingContent: "",
      chatError: null,
    }));

    // Persist user message
    try {
      await chat.saveMessage({
        id: userMsg.id,
        project_id: projectId,
        role: "user",
        content: prompt,
        provider: "mentor",
      });
    } catch (e) {
      console.error("[Chat] save user message:", e);
    }

    // Stream from web API
    abortController = new AbortController();

    try {
      await sendMentorMessage(
        prompt,
        session.access_token,
        {
          onToken: (text) => {
            set((s) => ({
              chatStreamingContent: s.chatStreamingContent + text,
            }));
          },
          onThinking: (text) => {
            set((s) => ({
              chatThinkingContent: s.chatThinkingContent + text,
            }));
          },
          onDone: async () => {
            const { chatStreamingContent } = get();
            if (!chatStreamingContent) {
              set({ chatStreaming: false });
              return;
            }

            const assistantMsg: ChatMessage = {
              id: crypto.randomUUID(),
              project_id: projectId,
              role: "assistant",
              content: chatStreamingContent,
              provider: "mentor",
              created_at: Date.now(),
            };

            set((s) => ({
              chatMessages: [...s.chatMessages, assistantMsg],
              chatStreaming: false,
              chatStreamingContent: "",
              chatThinkingContent: "",
            }));

            // Persist assistant message
            try {
              await chat.saveMessage({
                id: assistantMsg.id,
                project_id: projectId,
                role: "assistant",
                content: chatStreamingContent,
                provider: "mentor",
              });
            } catch (e) {
              console.error("[Chat] save assistant message:", e);
            }
          },
          onError: (error) => {
            set({ chatStreaming: false, chatError: error });
          },
        },
        abortController.signal,
      );
    } catch (e) {
      // AbortError is expected when user stops streaming
      if (e instanceof DOMException && e.name === "AbortError") {
        const { chatStreamingContent } = get();
        if (chatStreamingContent) {
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            project_id: projectId,
            role: "assistant",
            content: chatStreamingContent,
            provider: "mentor",
            created_at: Date.now(),
          };

          set((s) => ({
            chatMessages: [...s.chatMessages, assistantMsg],
            chatStreaming: false,
            chatStreamingContent: "",
            chatThinkingContent: "",
          }));

          try {
            await chat.saveMessage({
              id: assistantMsg.id,
              project_id: projectId,
              role: "assistant",
              content: chatStreamingContent,
              provider: "mentor",
            });
          } catch (err) {
            console.error("[Chat] save assistant message:", err);
          }
        } else {
          set({ chatStreaming: false });
        }
      } else {
        set({ chatStreaming: false, chatError: String(e) });
      }
    } finally {
      abortController = null;
    }
  },

  chatStopStreaming: () => {
    abortController?.abort();
  },

  chatLoadHistory: async (projectId) => {
    try {
      const messages = await chat.loadHistory(projectId);
      set({ chatMessages: messages });
    } catch (e) {
      console.error("[Chat] load history:", e);
    }
  },

  chatClearHistory: async (projectId) => {
    try {
      await chat.clearHistory(projectId);
      set({ chatMessages: [] });
    } catch (e) {
      console.error("[Chat] clear history:", e);
    }
  },
});
