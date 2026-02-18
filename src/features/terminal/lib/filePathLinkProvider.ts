// ── File Path Link Provider ──────────────────────────────────────────────────
// Custom xterm.js ILinkProvider that detects file paths in terminal output
// and makes them clickable → opens in file viewer.

import type { ILinkProvider, ILink, IBufferRange, Terminal } from "@xterm/xterm";
import { fs } from "@shared/lib/tauri";
import { useAppStore } from "@/lib/store";

const VALID_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "rs",
  "toml",
  "md",
  "css",
  "scss",
  "less",
  "html",
  "vue",
  "svelte",
  "py",
  "go",
  "rb",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "yaml",
  "yml",
  "sql",
  "sh",
  "bash",
  "zsh",
  "txt",
  "env",
  "lock",
  "xml",
  "svg",
  "prisma",
  "graphql",
  "proto",
  "cfg",
  "conf",
  "ini",
]);

// Find all path-like strings, validate extension
const SIMPLE_PATH_RE =
  /(?:\.\/|[\w@][\w@.-]*\/)([\w@.-]+\/)*[\w@.-]+\.[\w]{1,10}(?::\d+(?::\d+)?)?/g;
const ABSOLUTE_PATH_RE = /\/(?:[\w@.-]+\/)+[\w@.-]+\.[\w]{1,10}(?::\d+(?::\d+)?)?/g;

function findPaths(text: string): Array<{ path: string; start: number; end: number }> {
  const results: Array<{ path: string; start: number; end: number }> = [];
  const seen = new Set<string>();

  for (const re of [SIMPLE_PATH_RE, ABSOLUTE_PATH_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const raw = match[0];
      const filePath = raw.replace(/:\d+(?::\d+)?$/, "");
      const ext = filePath.split(".").pop()?.toLowerCase();
      if (!ext || !VALID_EXTENSIONS.has(ext)) continue;

      // Skip URLs (already handled by WebLinksAddon)
      if (text.substring(Math.max(0, match.index - 8), match.index).includes("://")) continue;

      const key = `${match.index}:${raw}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        path: raw,
        start: match.index,
        end: match.index + raw.length,
      });
    }
  }

  return results;
}

export function createFilePathLinkProvider(
  term: Terminal,
  _projectPath?: string | null,
): ILinkProvider {
  return {
    provideLinks(bufferLineNumber: number, callback: (links: ILink[] | undefined) => void) {
      // Always read fresh projectPath from store (avoids stale closure)
      const projectPath = useAppStore.getState().projectPath;
      if (!projectPath) {
        callback(undefined);
        return;
      }

      const line = term.buffer.active.getLine(bufferLineNumber - 1);
      if (!line) {
        callback(undefined);
        return;
      }

      const text = line.translateToString(true);
      const found = findPaths(text);
      if (found.length === 0) {
        callback(undefined);
        return;
      }

      const links: ILink[] = found.map(({ path: rawPath, start, end }) => {
        const range: IBufferRange = {
          start: { x: start + 1, y: bufferLineNumber },
          end: { x: end, y: bufferLineNumber },
        };

        return {
          range,
          text: rawPath,
          activate: (_event: MouseEvent, linkText: string) => {
            const cleanPath = linkText.replace(/:\d+(?::\d+)?$/, "");
            const fullPath = cleanPath.startsWith("/")
              ? cleanPath
              : `${projectPath}/${cleanPath.replace(/^\.\//, "")}`;

            fs.readFile(fullPath)
              .then((content) => {
                useAppStore.getState().setOpenFile(fullPath, content);
              })
              .catch(() => {
                // File not found or unreadable — silently ignore
              });
          },
        };
      });

      callback(links);
    },
  };
}
