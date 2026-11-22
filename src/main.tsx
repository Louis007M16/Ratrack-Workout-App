import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import "./index.css"
import App from "./App"
import ErrorBoundary from "@/components/shared/ErrorBoundary"
import { bootDb } from "@/db/boot"

const root = createRoot(document.getElementById("root")!)

root.render(<p className="mt-24 text-center text-sm text-muted-foreground">Loading…</p>)

bootDb()
  .then(() =>
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>
    )
  )
  .catch((e: unknown) =>
    root.render(
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-bold">Couldn't open your data</h1>
        <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-xs text-destructive">{String(e)}</pre>
        <button type="button" onClick={() => location.reload()}
          className="mt-4 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">Try again</button>
      </div>
    )
  )