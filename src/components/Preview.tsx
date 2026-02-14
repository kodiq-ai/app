import { useState, useRef, useCallback, useEffect } from "react";

export default function Preview() {
  const [url, setUrl] = useState("http://localhost:3000");
  const [inputUrl, setInputUrl] = useState(url);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 h-10 px-3 bg-[#141414] border-b border-[#262626] shrink-0">
        <button
          onClick={refresh}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#ffffff0a] text-neutral-500 hover:text-neutral-300 transition-colors"
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>

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

        {/* Status dot */}
        <div
          className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
            status === "ready"
              ? "bg-emerald-500"
              : status === "loading"
                ? "bg-amber-500 animate-pulse"
                : "bg-neutral-600"
          }`}
          title={status === "ready" ? "Connected" : status === "loading" ? "Loading..." : "Not available"}
        />
      </div>

      {/* Preview content */}
      <div className="relative flex-1 bg-[#0d0d0d]">
        {status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-600">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <p className="text-neutral-400 text-sm font-medium">No preview available</p>
                <p className="text-neutral-600 text-xs mt-1">
                  Start a dev server to see the preview
                </p>
              </div>
            </div>
          </div>
        ) : (
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
