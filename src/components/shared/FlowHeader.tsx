import type { ReactNode } from "react"
import { ChevronLeft } from "lucide-react"

type Props = { title: string; onBack: () => void; right?: ReactNode }

export default function FlowHeader({ title, onBack, right }: Props) {
  return (
    <header className="sticky top-0 z-30 -mx-4 -mt-6 mb-4 grid grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background px-2 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-11 items-center gap-1 justify-self-start rounded-lg px-2 text-sm text-muted-foreground active:bg-secondary"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back
      </button>
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="justify-self-end pr-2">{right}</div>
    </header>
  )
}