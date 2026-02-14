import { useState, useEffect, useCallback } from "react";
import Terminal from "./Terminal";
import {
  spawnTerminal,
  closeTerminal,
  detectCliTools,
  type CliTool,
} from "../hooks/useTerminal";

interface Tab {
  id: string;
  label: string;
  command: string;
}

export default function TerminalPanel() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [cliTools, setCliTools] = useState<CliTool[]>([]);
  const [showNewMenu, setShowNewMenu] = useState(false);

  // Detect CLI tools on mount
  useEffect(() => {
    detectCliTools()
      .then(setCliTools)
      .catch(() => {});
  }, []);

  // Spawn initial shell tab
  useEffect(() => {
    if (tabs.length === 0) {
      handleNewTab("shell");
    }
  }, []);

  const handleNewTab = useCallback(
    async (command: string) => {
      try {
        const id = await spawnTerminal(
          command === "shell" ? undefined : command,
        );
        const label = getLabel(command);
        const newTab: Tab = { id, label, command };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(id);
        setShowNewMenu(false);
      } catch (err) {
        console.error("Failed to spawn terminal:", err);
      }
    },
    [],
  );

  const handleCloseTab = useCallback(
    async (tabId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await closeTerminal(tabId).catch(() => {});
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          setActiveTabId(next.length > 0 ? next[next.length - 1].id : null);
        }
        return next;
      });
    },
    [activeTabId],
  );

  const installedCli = cliTools.filter((t) => t.installed);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center h-9 bg-[#111] border-b border-[#1e1e1e] shrink-0 overflow-x-auto">
        {/* Tabs */}
        <div className="flex items-center flex-1 min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-1.5 h-9 px-3 text-xs border-r border-[#1e1e1e] shrink-0 transition-colors ${
                activeTabId === tab.id
                  ? "bg-[#0d0d0d] text-neutral-200"
                  : "bg-[#111] text-neutral-500 hover:text-neutral-300 hover:bg-[#161616]"
              }`}
            >
              {/* Icon */}
              <span className="text-[10px]">{getIcon(tab.command)}</span>

              {/* Label */}
              <span className="truncate max-w-[100px]">{tab.label}</span>

              {/* Close button */}
              <span
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="ml-1 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-[#ffffff15] text-neutral-500 hover:text-neutral-300 transition-all"
              >
                ×
              </span>
            </button>
          ))}
        </div>

        {/* New tab button */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="w-9 h-9 flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-[#1a1a1a] transition-colors"
            title="New terminal"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showNewMenu && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl z-50 py-1 overflow-hidden">
              {/* Shell */}
              <button
                onClick={() => handleNewTab("shell")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:bg-[#ffffff08] transition-colors"
              >
                <span className="text-sm">⬛</span>
                <span>Terminal</span>
                <span className="ml-auto text-neutral-600 text-[10px]">
                  zsh
                </span>
              </button>

              {/* Separator */}
              {installedCli.length > 0 && (
                <div className="my-1 border-t border-[#262626]" />
              )}

              {/* CLI tools */}
              {installedCli.map((tool) => (
                <button
                  key={tool.bin}
                  onClick={() => handleNewTab(tool.bin)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:bg-[#ffffff08] transition-colors"
                >
                  <span className="text-sm">{getCliIcon(tool.provider)}</span>
                  <span>{tool.name}</span>
                  <span className="ml-auto text-neutral-600 text-[10px] truncate max-w-[80px]">
                    {tool.version.split("(")[0]?.trim() || ""}
                  </span>
                </button>
              ))}

              {/* Not installed tools hint */}
              {cliTools.filter((t) => !t.installed).length > 0 && (
                <>
                  <div className="my-1 border-t border-[#262626]" />
                  <div className="px-3 py-1.5 text-[10px] text-neutral-600">
                    Not installed:
                  </div>
                  {cliTools
                    .filter((t) => !t.installed)
                    .map((tool) => (
                      <div
                        key={tool.bin}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-neutral-600"
                      >
                        <span className="text-sm opacity-40">
                          {getCliIcon(tool.provider)}
                        </span>
                        <span>{tool.name}</span>
                      </div>
                    ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Terminal instances */}
      <div className="relative flex-1">
        {tabs.map((tab) => (
          <Terminal
            key={tab.id}
            terminalId={tab.id}
            isActive={tab.id === activeTabId}
          />
        ))}

        {/* Empty state */}
        {tabs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-2xl">
                ⬛
              </div>
              <div>
                <p className="text-neutral-400 text-sm font-medium">
                  No terminals open
                </p>
                <p className="text-neutral-600 text-xs mt-1">
                  Click + to open a terminal
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showNewMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNewMenu(false)}
        />
      )}
    </div>
  );
}

function getLabel(command: string): string {
  switch (command) {
    case "shell":
      return "Terminal";
    case "claude":
      return "Claude Code";
    case "gemini":
      return "Gemini CLI";
    case "codex":
      return "Codex CLI";
    case "aider":
      return "Aider";
    case "ollama":
      return "Ollama";
    default:
      return command;
  }
}

function getIcon(command: string): string {
  switch (command) {
    case "shell":
      return "⬛";
    case "claude":
      return "🟠";
    case "gemini":
      return "🔵";
    case "codex":
      return "🟢";
    case "aider":
      return "🟣";
    case "ollama":
      return "🦙";
    default:
      return "⬛";
  }
}

function getCliIcon(provider: string): string {
  switch (provider) {
    case "anthropic":
      return "🟠";
    case "google":
      return "🔵";
    case "openai":
      return "🟢";
    case "aider":
      return "🟣";
    case "ollama":
      return "🦙";
    default:
      return "⬛";
  }
}
