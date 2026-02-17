import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/browser";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`,
      error,
      info.componentStack,
    );
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
          <div className="flex max-w-[280px] flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <span className="text-lg text-red-400">!</span>
            </div>
            <p className="text-[13px] font-medium text-[#f4f4f5]">
              {this.props.fallbackTitle || t("somethingWentWrong")}
            </p>
            <p className="text-[11px] leading-relaxed text-[#52525b]">
              {this.state.error?.message || t("unknownError")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={this.handleReset}
            className="gap-1.5 text-[11px] text-[#a1a1aa] hover:text-[#a1a1aa]"
          >
            <RotateCcw className="size-3" />
            {t("reload")}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
