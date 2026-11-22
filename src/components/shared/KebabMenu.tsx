import { useEffect, useRef, useState } from "react"
import { EllipsisVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export type MenuItem = { label: string; onSelect: () => void; destructive?: boolean }

export default function KebabMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
      >
        <EllipsisVertical className="size-5" aria-hidden="true" />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-50 mt-1 min-w-40 rounded-xl border border-border bg-popover p-1 shadow-lg">
          {items.map((it) => (
            <li key={it.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); it.onSelect() }}
                className={cn("w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-secondary", it.destructive && "text-destructive")}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}