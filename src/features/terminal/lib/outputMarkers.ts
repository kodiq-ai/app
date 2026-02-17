// ── Output Section Markers ───────────────────────────────────────────────────
// Places visual teal dots on the right gutter of the terminal to mark section
// boundaries (code blocks, horizontal rules, long output gaps).
// Users can visually scan these markers to navigate long terminal output.

import type { Terminal, IMarker, IDecoration } from "@xterm/xterm";

// ANSI escape code stripper
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g;

// Section boundary patterns (tested on clean text)
const SECTION_RE = /^```|^───|^─{3,}|^-{3,}\s*$|^\*{3,}\s*$|^={3,}\s*$/m;

// Minimum lines between markers to avoid cluttering
const MIN_GAP = 30;

interface MarkerEntry {
  marker: IMarker;
  decoration: IDecoration;
}

export class OutputMarkerManager {
  private markers: MarkerEntry[] = [];
  private lineCount = 0;
  private lastMarkerLine = 0;

  constructor(private term: Terminal) {}

  onOutput(data: string) {
    const newLines = (data.match(/\n/g) || []).length;
    this.lineCount += newLines;

    // Only check for sections if enough lines have passed since last marker
    if (this.lineCount - this.lastMarkerLine < MIN_GAP) return;

    const clean = data.replace(ANSI_RE, "");
    if (SECTION_RE.test(clean)) {
      this.addMarker();
    }
  }

  private addMarker() {
    const marker = this.term.registerMarker(0);
    if (!marker) return;

    const decoration = this.term.registerDecoration({
      marker,
      anchor: "right",
      width: 1,
    });
    if (!decoration) return;

    decoration.onRender((el) => {
      el.style.width = "4px";
      el.style.height = "4px";
      el.style.borderRadius = "50%";
      el.style.background = "rgba(20, 184, 166, 0.35)";
      el.style.position = "absolute";
      el.style.right = "6px";
      el.style.pointerEvents = "none";
    });

    this.markers.push({ marker, decoration });
    this.lastMarkerLine = this.lineCount;
  }

  dispose() {
    for (const { marker, decoration } of this.markers) {
      decoration.dispose();
      marker.dispose();
    }
    this.markers = [];
    this.lineCount = 0;
    this.lastMarkerLine = 0;
  }
}
