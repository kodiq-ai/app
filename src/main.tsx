import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { t } from "@/lib/i18n";
import App from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallbackTitle={t("criticalError")}>
    <TooltipProvider delayDuration={300}>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1a1b1e",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#e4e4e7",
            fontSize: "12px",
          },
        }}
      />
    </TooltipProvider>
  </ErrorBoundary>
);
