import { Component, type ErrorInfo, type ReactNode } from "react"

type State = { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-md p-6 text-foreground">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-xs text-destructive">
          {this.state.error.message}
        </pre>
        <button type="button" onClick={() => location.reload()}
          className="mt-4 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">
          Reload
        </button>
      </div>
    )
  }
}