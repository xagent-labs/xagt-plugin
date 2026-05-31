"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm font-medium text-neutral-600">Something went wrong</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="btn-primary text-sm px-4 py-1.5"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
