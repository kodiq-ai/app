import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { t } from "@/lib/i18n";
import App from "./App";
import "./app.css";

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
            color: "#f4f4f5",
            fontSize: "12px",
            fontFamily: "'Monaspace Neon', 'SF Mono', 'Fira Code', monospace",
          },
        }}
      />
    </TooltipProvider>
  </ErrorBoundary>,
);
