import type { StateCreator } from "zustand";
import type { ChatMessage, ChatProvider } from "@shared/lib/types";
import { chat } from "@shared/lib/tauri";
import { listen } from "@tauri-apps/api/event";

export interface ChatSlice {
  // State
  chatMessages: ChatMessage[];
  chatStreaming: boolean;
  chatStreamingContent: string;
  chatActiveProvider: ChatProvider;
  chatError: string | null;

  // Actions
  chatSendMessage: (prompt: string, projectId: string, cwd?: string | null) => Promise<void>;
  chatStopStreaming: () => Promise<void>;
  chatSetProvider: (provider: ChatProvider) => void;
  chatLoadHistory: (projectId: string) => Promise<void>;
  chatClearHistory: (projectId: string) => Promise<void>;
  chatSetupListeners: () => Promise<() => void>;
}

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set, get) => ({
  chatMessages: [],
  chatStreaming: false,
  chatStreamingContent: "",
  chatActiveProvider: "claude",
  chatError: null,

  chatSendMessage: async (prompt, projectId, cwd) => {
    const provider = get().chatActiveProvider;

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: projectId,
      role: "user",
      content: prompt,
      provider,
      created_at: Date.now(),
    };

    set((s) => ({
      chatMessages: [...s.chatMessages, userMsg],
      chatStreaming: true,
      chatStreamingContent: "",
      chatError: null,
    }));

    // Persist user message
    try {
      await chat.saveMessage({
        id: userMsg.id,
        project_id: projectId,
        role: "user",
        content: prompt,
        provider,
      });
    } catch (e) {
      console.error("[Chat] save user message:", e);
    }

    // Send to CLI tool
    try {
      await chat.send(provider, prompt, cwd);
    } catch (e) {
      set({ chatStreaming: false, chatError: String(e) });
    }
  },

  chatStopStreaming: async () => {
    try {
      await chat.stop();
    } catch {
      // ignore — process may already be dead
    }

    // Finalize any accumulated streaming content
    const { chatStreamingContent, chatMessages, chatActiveProvider } = get();
    if (chatStreamingContent) {
      const projectId = chatMessages.at(-1)?.project_id ?? "";
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        project_id: projectId,
        role: "assistant",
        content: chatStreamingContent,
        provider: chatActiveProvider,
        created_at: Date.now(),
      };

      set((s) => ({
        chatMessages: [...s.chatMessages, assistantMsg],
        chatStreaming: false,
        chatStreamingContent: "",
      }));

      // Persist assistant message
      try {
        await chat.saveMessage({
          id: assistantMsg.id,
          project_id: projectId,
          role: "assistant",
          content: chatStreamingContent,
          provider: chatActiveProvider,
        });
      } catch (e) {
        console.error("[Chat] save assistant message:", e);
      }
    } else {
      set({ chatStreaming: false });
    }
  },

  chatSetProvider: (provider) => set({ chatActiveProvider: provider }),

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

  chatSetupListeners: async () => {
    // Listen for streaming chunks
    const unlistenChunk = await listen<{ provider: string; content: string }>(
      "chat-chunk",
      (event) => {
        set((s) => ({
          chatStreamingContent: s.chatStreamingContent + event.payload.content,
        }));
      },
    );

    // Listen for process completion
    const unlistenDone = await listen<{ provider: string }>("chat-done", async () => {
      const { chatStreamingContent, chatMessages, chatActiveProvider } = get();

      if (chatStreamingContent) {
        const projectId = chatMessages.at(-1)?.project_id ?? "";
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          project_id: projectId,
          role: "assistant",
          content: chatStreamingContent,
          provider: chatActiveProvider,
          created_at: Date.now(),
        };

        set((s) => ({
          chatMessages: [...s.chatMessages, assistantMsg],
          chatStreaming: false,
          chatStreamingContent: "",
        }));

        // Persist assistant message
        try {
          await chat.saveMessage({
            id: assistantMsg.id,
            project_id: projectId,
            role: "assistant",
            content: chatStreamingContent,
            provider: chatActiveProvider,
          });
        } catch (e) {
          console.error("[Chat] save assistant message:", e);
        }
      } else {
        set({ chatStreaming: false });
      }
    });

    return () => {
      unlistenChunk();
      unlistenDone();
    };
  },
});
