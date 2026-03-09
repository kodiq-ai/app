import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { Trash2, GraduationCap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessageItem } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export function ChatPanel() {
  const projectId = useAppStore((s) => s.projectId);
  const messages = useAppStore((s) => s.chatMessages);
  const isStreaming = useAppStore((s) => s.chatStreaming);
  const streamingContent = useAppStore((s) => s.chatStreamingContent);
  const thinkingContent = useAppStore((s) => s.chatThinkingContent);
  const chatError = useAppStore((s) => s.chatError);
  const sendMessage = useAppStore((s) => s.chatSendMessage);
  const stopStreaming = useAppStore((s) => s.chatStopStreaming);
  const loadHistory = useAppStore((s) => s.chatLoadHistory);
  const clearHistory = useAppStore((s) => s.chatClearHistory);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const signInWithOAuth = useAppStore((s) => s.signInWithOAuth);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    if (projectId) {
      void loadHistory(projectId);
    }
  }, [projectId, loadHistory]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingContent, thinkingContent]);

  const handleSend = useCallback(
    (prompt: string) => {
      if (!projectId) return;
      void sendMessage(prompt, projectId);
    },
    [projectId, sendMessage],
  );

  const handleClear = useCallback(() => {
    if (!projectId) return;
    void clearHistory(projectId);
    toast.success(t("chatCleared"));
  }, [projectId, clearHistory]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div className="text-k-text-secondary flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
          <GraduationCap className="h-3.5 w-3.5" />
          {t("mentorTitle")}
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClear}
            title={t("chatClearHistory")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Auth check */}
      {!isAuthenticated ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
          <GraduationCap className="text-k-text-tertiary h-8 w-8" />
          <p className="text-k-text-tertiary text-center text-xs">{t("mentorSignInRequired")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void signInWithOAuth("github")}
            className="border-k-border text-k-text-secondary h-7 gap-1.5 text-xs"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </Button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="flex flex-col py-2">
              {messages.length === 0 && !isStreaming && (
                <div className="text-k-text-tertiary flex flex-1 items-center justify-center px-4 py-12 text-center text-xs">
                  {t("chatNoMessages")}
                </div>
              )}

              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  provider={msg.provider}
                />
              ))}

              {/* Thinking indicator */}
              {isStreaming && thinkingContent && !streamingContent && (
                <div className="mx-3 my-2">
                  <details className="rounded-md bg-white/[0.02] text-[11px]">
                    <summary className="text-k-text-tertiary cursor-pointer px-3 py-1.5 select-none">
                      {t("mentorThinking")}
                    </summary>
                    <div className="text-k-text-tertiary border-t border-white/[0.04] px-3 py-2 whitespace-pre-wrap">
                      {thinkingContent}
                    </div>
                  </details>
                </div>
              )}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <ChatMessageItem
                  role="assistant"
                  content={streamingContent}
                  provider="mentor"
                  isStreaming
                  thinkingContent={thinkingContent}
                />
              )}

              {/* Error */}
              {chatError && (
                <div className="mx-3 my-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {chatError === "mentorSignInRequired" ? t("mentorSignInRequired") : chatError}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <ChatInput onSend={handleSend} onStop={stopStreaming} isStreaming={isStreaming} />
        </>
      )}
    </div>
  );
}
