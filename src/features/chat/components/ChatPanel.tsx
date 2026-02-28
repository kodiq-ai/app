import { useEffect, useRef, useCallback, useState } from "react";
import { useAppStore } from "@/lib/store";
import { cli } from "@shared/lib/tauri";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatProvider, CliTool } from "@shared/lib/types";
import { ChatMessageItem } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

const providerLabels: Record<ChatProvider, string> = {
  claude: "Claude",
  gemini: "Gemini",
  codex: "Codex",
};

export function ChatPanel() {
  const projectId = useAppStore((s) => s.projectId);
  const projectPath = useAppStore((s) => s.projectPath);
  const messages = useAppStore((s) => s.chatMessages);
  const isStreaming = useAppStore((s) => s.chatStreaming);
  const streamingContent = useAppStore((s) => s.chatStreamingContent);
  const activeProvider = useAppStore((s) => s.chatActiveProvider);
  const chatError = useAppStore((s) => s.chatError);
  const sendMessage = useAppStore((s) => s.chatSendMessage);
  const stopStreaming = useAppStore((s) => s.chatStopStreaming);
  const setProvider = useAppStore((s) => s.chatSetProvider);
  const loadHistory = useAppStore((s) => s.chatLoadHistory);
  const clearHistory = useAppStore((s) => s.chatClearHistory);
  const setupListeners = useAppStore((s) => s.chatSetupListeners);

  const [availableProviders, setAvailableProviders] = useState<CliTool[]>([]);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history + detect CLI tools on mount
  useEffect(() => {
    if (projectId) {
      void loadHistory(projectId);
    }
  }, [projectId, loadHistory]);

  useEffect(() => {
    void cli.detectTools().then((tools) => {
      const installed = tools.filter((tool) => tool.installed);
      setAvailableProviders(installed);
      // Auto-select first installed provider if current isn't available
      const first = installed[0];
      if (first && !installed.some((tool) => tool.bin === activeProvider)) {
        setProvider(first.bin as ChatProvider);
      }
    });
  }, [activeProvider, setProvider]);

  // Setup event listeners
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void setupListeners().then((unsub) => {
      cleanup = unsub;
    });
    return () => cleanup?.();
  }, [setupListeners]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = useCallback(
    (prompt: string) => {
      if (!projectId) return;
      void sendMessage(prompt, projectId, projectPath);
    },
    [projectId, projectPath, sendMessage],
  );

  const handleClear = useCallback(() => {
    if (!projectId) return;
    void clearHistory(projectId);
    toast.success(t("chatCleared"));
  }, [projectId, clearHistory]);

  const currentProviderInstalled = availableProviders.some((tool) => tool.bin === activeProvider);

  return (
    <div className="flex h-full flex-col">
      {/* Header — provider selector + clear */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setProviderMenuOpen(!providerMenuOpen)}
            className="text-k-text-secondary hover:text-k-text flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            {providerLabels[activeProvider] ?? activeProvider}
            <ChevronDown className="h-3 w-3" />
          </button>

          {providerMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProviderMenuOpen(false)} />
              <div className="bg-k-bg-secondary absolute top-full left-0 z-20 mt-1 min-w-[120px] rounded-md border border-white/[0.08] py-1 shadow-lg">
                {availableProviders.map((tool) => (
                  <button
                    key={tool.bin}
                    type="button"
                    onClick={() => {
                      setProvider(tool.bin as ChatProvider);
                      setProviderMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                      tool.bin === activeProvider
                        ? "text-k-accent"
                        : "text-k-text-secondary hover:text-k-text hover:bg-white/[0.04]"
                    }`}
                  >
                    {tool.name}
                  </button>
                ))}
                {availableProviders.length === 0 && (
                  <div className="text-k-text-tertiary px-3 py-2 text-[11px]">
                    {t("chatNoProviders")}
                  </div>
                )}
              </div>
            </>
          )}
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

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <ChatMessageItem
              role="assistant"
              content={streamingContent}
              provider={activeProvider}
              isStreaming
            />
          )}

          {/* Error */}
          {chatError && (
            <div className="mx-3 my-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {chatError}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!currentProviderInstalled}
      />
    </div>
  );
}
