import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const MS = 320

export default function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open)
  const [show, setShow] = useState(open)
  const [settled, setSettled] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setSettled(false)
      // wait two frames so the browser paints the closed state first
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)))
      const t = setTimeout(() => setSettled(true), MS)
      return () => { cancelAnimationFrame(raf); clearTimeout(t) }
    }
    setSettled(false)
    setShow(false)
    const t = setTimeout(() => setMounted(false), MS)
    return () => clearTimeout(t)
  }, [open])

  if (!mounted) return null

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-ios motion-reduce:transition-none",
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      {/* overflow is only clipped while animating, so the ⋮ menus aren't cut off once it's open */}
      <div className={cn("min-h-0", !settled && "overflow-hidden")} inert={!show}>
        {children}
      </div>
    </div>
  )
}