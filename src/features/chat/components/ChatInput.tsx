import { useCallback, useRef, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const value = textarea.value.trim();
    if (!value || isStreaming) return;

    onSend(value);
    textarea.value = "";
    textarea.style.height = "auto";
  }, [isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, []);

  return (
    <div className="border-t border-white/[0.06] p-2">
      <div className="bg-k-bg-secondary flex items-end gap-1.5 rounded-lg border border-white/[0.06] px-2 py-1.5">
        <textarea
          ref={textareaRef}
          placeholder={t("chatPlaceholder")}
          disabled={disabled || isStreaming}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-[13px] leading-relaxed outline-none",
            "text-k-text placeholder:text-k-text-tertiary",
            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10",
            "max-h-[150px]",
          )}
        />

        {isStreaming ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onStop}
            className="text-red-400 hover:text-red-300"
            title={t("chatStop")}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleSend}
            disabled={disabled}
            className="text-k-text-tertiary hover:text-k-accent"
            title={t("chatSend")}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isStreaming && (
        <div className="text-k-text-tertiary mt-1 flex items-center gap-1.5 px-1 text-[10px]">
          <span className="bg-k-accent inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
          {t("chatStreaming")}
        </div>
      )}
    </div>
  );
}
