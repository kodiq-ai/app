import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface SidebarProps {
  projectPath: string | null;
  onOpenProject: (path: string) => void;
}

// File type → icon + color
function getFileIcon(name: string, isDir: boolean): { icon: string; color: string } {
  if (isDir) return { icon: "📁", color: "" };

  const ext = name.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "ts":
    case "tsx":
      return { icon: "TS", color: "text-blue-400" };
    case "js":
    case "jsx":
      return { icon: "JS", color: "text-yellow-400" };
    case "json":
      return { icon: "{}", color: "text-yellow-600" };
    case "css":
    case "scss":
      return { icon: "◆", color: "text-purple-400" };
    case "html":
      return { icon: "◇", color: "text-orange-400" };
    case "md":
      return { icon: "M↓", color: "text-neutral-400" };
    case "rs":
      return { icon: "🦀", color: "" };
    case "toml":
    case "yaml":
    case "yml":
      return { icon: "⚙", color: "text-neutral-500" };
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
    case "gif":
    case "webp":
    case "ico":
      return { icon: "🖼", color: "" };
    case "lock":
      return { icon: "🔒", color: "" };
    default:
      return { icon: "·", color: "text-neutral-500" };
  }
}

function FileTree({
  entries,
  depth = 0,
}: {
  entries: FileEntry[];
  depth?: number;
}) {
  return (
    <>
      {entries.map((entry) => (
        <FileTreeItem key={entry.path} entry={entry} depth={depth} />
      ))}
    </>
  );
}

function FileTreeItem({
  entry,
  depth,
}: {
  entry: FileEntry;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!entry.isDir) return;

    if (expanded) {
      setExpanded(false);
      return;
    }

    if (children === null) {
      setLoading(true);
      try {
        const items = await invoke<FileEntry[]>("read_dir", {
          path: entry.path,
        });
        setChildren(items);
      } catch {
        setChildren([]);
      }
      setLoading(false);
    }

    setExpanded(true);
  }, [entry, expanded, children]);

  const { icon, color } = getFileIcon(entry.name, entry.isDir);
  const paddingLeft = 12 + depth * 14;

  return (
    <>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-1.5 h-[26px] text-[11px] hover:bg-[#ffffff06] transition-colors text-left group"
        style={{ paddingLeft }}
      >
        {/* Expand arrow for dirs */}
        {entry.isDir ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`shrink-0 text-neutral-600 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        ) : (
          <span className="w-[10px] shrink-0" />
        )}

        {/* Icon */}
        <span className={`text-[10px] shrink-0 ${color} ${!color ? "grayscale-0" : ""}`}>
          {icon}
        </span>

        {/* Name */}
        <span
          className={`truncate ${
            entry.isDir ? "text-neutral-300" : "text-neutral-500"
          }`}
        >
          {entry.name}
        </span>
      </button>

      {/* Children */}
      {expanded && children && children.length > 0 && (
        <FileTree entries={children} depth={depth + 1} />
      )}

      {/* Loading */}
      {loading && (
        <div
          className="h-[26px] flex items-center text-[10px] text-neutral-600"
          style={{ paddingLeft: paddingLeft + 24 }}
        >
          Loading...
        </div>
      )}
    </>
  );
}

export default function Sidebar({ projectPath, onOpenProject }: SidebarProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  // Load root directory
  useEffect(() => {
    if (!projectPath) {
      setEntries([]);
      return;
    }

    invoke<FileEntry[]>("read_dir", { path: projectPath })
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [projectPath]);

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open Project",
    });
    if (selected && typeof selected === "string") {
      onOpenProject(selected);
    }
  }, [onOpenProject]);

  const projectName = projectPath?.split("/").pop() || "";

  if (collapsed) {
    return (
      <div className="flex flex-col items-center w-10 bg-[#111] border-r border-[#1e1e1e] shrink-0 sidebar-animate">
        {/* Expand button */}
        <button
          onClick={() => setCollapsed(false)}
          className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-[#1a1a1a] transition-colors"
          title="Expand sidebar"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Open folder */}
        <button
          onClick={handleOpenFolder}
          className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-neutral-300 hover:bg-[#1a1a1a] transition-colors"
          title="Open Project"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-56 bg-[#111] border-r border-[#1e1e1e] shrink-0 overflow-hidden sidebar-animate">
      {/* Header */}
      <div className="flex items-center h-9 px-3 border-b border-[#1e1e1e] shrink-0">
        <button
          onClick={() => setCollapsed(true)}
          className="w-5 h-5 flex items-center justify-center rounded text-neutral-600 hover:text-neutral-300 hover:bg-[#ffffff0a] transition-colors mr-2 shrink-0"
          title="Collapse sidebar"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {projectPath ? (
          <span className="text-[11px] text-neutral-300 font-medium truncate flex-1">
            {projectName}
          </span>
        ) : (
          <span className="text-[11px] text-neutral-600 truncate flex-1">
            No project
          </span>
        )}

        {/* Open folder button */}
        <button
          onClick={handleOpenFolder}
          className="w-5 h-5 flex items-center justify-center rounded text-neutral-600 hover:text-neutral-300 hover:bg-[#ffffff0a] transition-colors shrink-0"
          title="Open Project"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </button>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {projectPath ? (
          entries.length > 0 ? (
            <FileTree entries={entries} />
          ) : (
            <div className="px-3 py-4 text-[10px] text-neutral-600 text-center">
              Empty project
            </div>
          )
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full px-4 gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#262626] flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-neutral-600"
              >
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-neutral-500 text-[11px] font-medium">
                Open a project
              </p>
              <p className="text-neutral-600 text-[10px] mt-1">
                Select a folder to get started
              </p>
            </div>
            <button
              onClick={handleOpenFolder}
              className="px-3 py-1.5 bg-[#14b8a615] border border-[#14b8a630] rounded-md text-[11px] text-[#14b8a6] font-medium hover:bg-[#14b8a625] transition-colors"
            >
              Open Folder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
