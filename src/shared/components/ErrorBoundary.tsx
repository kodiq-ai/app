import { Component, type ErrorInfo, type ReactNode } from "react";
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
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full gap-4 p-6">
          <div className="flex flex-col items-center gap-2 max-w-[280px] text-center">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <span className="text-red-400 text-lg">!</span>
            </div>
            <p className="text-[13px] text-[#e4e4e7] font-medium">
              {this.props.fallbackTitle || t("somethingWentWrong")}
            </p>
            <p className="text-[11px] text-[#52525c] leading-relaxed">
              {this.state.error?.message || t("unknownError")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={this.handleReset}
            className="text-[11px] text-[#71717a] hover:text-[#a1a1aa] gap-1.5"
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
