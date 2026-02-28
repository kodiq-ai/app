import { memo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { ChatRole, ChatProvider } from "@shared/lib/types";

interface ChatMessageProps {
  role: ChatRole;
  content: string;
  provider: ChatProvider;
  isStreaming?: boolean;
}

const providerLabel: Record<ChatProvider, string> = {
  claude: "Claude",
  gemini: "Gemini",
  codex: "Codex",
};

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(children);
    toast.success(t("chatCodeCopied"));
  }, [children]);

  return (
    <div className="group/code relative">
      <pre className={cn("overflow-x-auto rounded-md bg-black/30 p-3 text-xs", className)}>
        <code>{children}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-1.5 right-1.5 rounded p-1 text-white/40 opacity-0 transition-opacity group-hover/code:opacity-100 hover:text-white/80"
        title={t("chatCopyCode")}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export const ChatMessageItem = memo(
  ({ role, content, provider, isStreaming }: ChatMessageProps) => {
    return (
      <div
        className={cn("flex gap-2 px-3 py-2", role === "user" ? "justify-end" : "justify-start")}
      >
        <div
          className={cn(
            "max-w-[90%] rounded-lg px-3 py-2 text-[13px] leading-relaxed",
            role === "user"
              ? "bg-k-accent/20 text-k-text"
              : "text-k-text-secondary bg-white/[0.04]",
          )}
        >
          {role === "assistant" && (
            <div className="text-k-text-tertiary mb-1 text-[10px] font-medium tracking-wider uppercase">
              {providerLabel[provider]}
            </div>
          )}

          {role === "user" ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&_ol]:my-1 [&_p]:my-1 [&_pre]:my-2 [&_ul]:my-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  pre: ({ children }) => <>{children}</>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="rounded bg-white/10 px-1 py-0.5 text-xs">{children}</code>
                      );
                    }
                    return (
                      <CodeBlock className={className}>
                        {String(children).replace(/\n$/, "")}
                      </CodeBlock>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}

          {isStreaming && (
            <span className="bg-k-accent mt-1 inline-block h-4 w-1.5 animate-pulse rounded-sm" />
          )}
        </div>
      </div>
    );
  },
);
ChatMessageItem.displayName = "ChatMessageItem";
