import { useState, useRef, useCallback, useEffect } from "react";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORTS: Record<Viewport, { w: number; h: number; label: string }> = {
  desktop: { w: 0, h: 0, label: "Desktop" }, // 0 = fill container
  tablet: { w: 768, h: 1024, label: "iPad" },
  mobile: { w: 390, h: 844, label: "iPhone" },
};

export default function Preview() {
  const [url, setUrl] = useState("http://localhost:3000");
  const [inputUrl, setInputUrl] = useState(url);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = useCallback(() => {
    let target = inputUrl.trim();
    if (target && !target.startsWith("http")) {
      target = "http://" + target;
    }
    setUrl(target);
    setStatus("loading");
  }, [inputUrl]);

  const refresh = useCallback(() => {
    if (iframeRef.current) {
      setStatus("loading");
      iframeRef.current.src = url;
    }
  }, [url]);

  // Probe the URL to see if it's reachable
  useEffect(() => {
    setStatus("loading");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    fetch(url, { mode: "no-cors", signal: controller.signal })
      .then(() => setStatus("ready"))
      .catch(() => setStatus("error"));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  const vp = VIEWPORTS[viewport];
  const isConstrained = vp.w > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 h-10 px-3 bg-[#141414] border-b border-[#262626] shrink-0">
        {/* Refresh */}
        <button
          onClick={refresh}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#ffffff0a] text-neutral-500 hover:text-neutral-300 transition-colors"
          title="Refresh"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>

        {/* URL bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate();
          }}
          className="flex-1"
        >
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full h-7 px-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-xs text-neutral-400 font-mono outline-none focus:border-[#14b8a6]/50 focus:text-neutral-200 transition-colors"
            placeholder="http://localhost:3000"
          />
        </form>

        {/* Viewport switcher */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Desktop */}
          <button
            onClick={() => setViewport("desktop")}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              viewport === "desktop"
                ? "bg-[#ffffff0f] text-neutral-200"
                : "text-neutral-600 hover:text-neutral-400"
            }`}
            title="Desktop"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </button>

          {/* Tablet */}
          <button
            onClick={() => setViewport("tablet")}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              viewport === "tablet"
                ? "bg-[#ffffff0f] text-neutral-200"
                : "text-neutral-600 hover:text-neutral-400"
            }`}
            title="Tablet (768×1024)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M12 18h.01" />
            </svg>
          </button>

          {/* Mobile */}
          <button
            onClick={() => setViewport("mobile")}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              viewport === "mobile"
                ? "bg-[#ffffff0f] text-neutral-200"
                : "text-neutral-600 hover:text-neutral-400"
            }`}
            title="Mobile (390×844)"
          >
            <svg
              width="12"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="5" y="2" width="14" height="20" rx="3" />
              <path d="M12 18h.01" />
            </svg>
          </button>
        </div>

        {/* Status dot */}
        <div
          className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
            status === "ready"
              ? "bg-emerald-500"
              : status === "loading"
                ? "bg-amber-500 animate-pulse"
                : "bg-neutral-600"
          }`}
          title={
            status === "ready"
              ? "Connected"
              : status === "loading"
                ? "Loading..."
                : "Not available"
          }
        />
      </div>

      {/* Preview content */}
      <div className="relative flex-1 bg-[#0a0a0a] overflow-hidden">
        {status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-neutral-600"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <p className="text-neutral-400 text-sm font-medium">
                  No preview available
                </p>
                <p className="text-neutral-600 text-xs mt-1">
                  Start a dev server to see the preview
                </p>
              </div>
            </div>
          </div>
        ) : isConstrained ? (
          /* Device frame */
          <div className="absolute inset-0 flex items-start justify-center pt-4 overflow-auto">
            <div
              className="relative shrink-0 rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] shadow-2xl overflow-hidden"
              style={{ width: vp.w, height: vp.h, maxHeight: "calc(100% - 32px)" }}
            >
              <iframe
                ref={iframeRef}
                src={url}
                className="w-full h-full border-0"
                style={{ background: "#fff" }}
                title="Preview"
                onLoad={() => setStatus("ready")}
                onError={() => setStatus("error")}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
              {/* Size label */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-[#000000aa] rounded text-[10px] text-neutral-500 font-mono pointer-events-none">
                {vp.w}×{vp.h}
              </div>
            </div>
          </div>
        ) : (
          /* Full width desktop */
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            style={{ background: status === "ready" ? "#fff" : "transparent" }}
            title="Preview"
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("error")}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}
      </div>
    </div>
  );
}
