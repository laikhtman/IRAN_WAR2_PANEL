import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 gap-3 min-h-[120px] border border-border rounded-md bg-card/30">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          <p className="text-sm font-semibold text-foreground">
            {this.props.fallbackTitle || "Panel failed to load"}
          </p>
          <p className="text-xs text-muted-foreground text-center max-w-[240px]">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-1.5">
            <RefreshCcw className="w-3.5 h-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
