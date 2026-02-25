import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { t } from "@/lib/i18n";
import { initAnalytics, trackEvent } from "@/shared/lib/analytics";
import App from "./App";
import "./app.css";

// -- Monaspace fonts (bundled locally for offline support) -------
import "@fontsource/monaspace-krypton/400.css";
import "@fontsource/monaspace-krypton/600.css";
import "@fontsource/monaspace-krypton/700.css";
import "@fontsource/monaspace-neon/400.css";
import "@fontsource/monaspace-neon/500.css";
import "@fontsource/monaspace-neon/600.css";
import "@fontsource/monaspace-argon/400.css";
import "@fontsource/monaspace-argon/500.css";

initAnalytics();
trackEvent("app_launched", { version: __APP_VERSION__ });

const appStartTime = Date.now();
window.addEventListener("beforeunload", () => {
  trackEvent("app_closed", {
    session_duration_s: Math.round((Date.now() - appStartTime) / 1000),
  });
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
createRoot(rootEl).render(
  <ErrorBoundary fallbackTitle={t("criticalError")}>
    <TooltipProvider delayDuration={300}>
      <App />
      <Toaster
        position="bottom-right"
        offset={16}
        gap={8}
        toastOptions={{
          style: {
            background: "#1a1b1e",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#E6E6E9",
            fontSize: "12px",
            fontFamily: "'Monaspace Neon', 'SF Mono', 'Fira Code', monospace",
          },
        }}
      />
    </TooltipProvider>
  </ErrorBoundary>,
);
