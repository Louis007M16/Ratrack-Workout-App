import { cn } from "@/lib/utils"

type Props = {
  items: readonly string[]
  value: string
  onChange: (v: string) => void
  className?: string
}

export default function Chips({ items, value, onChange, className }: Props) {
  return (
    <div className={className}>
      {items.map((item) => {
        const active = item === value
        return (
          <button
            key={item}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors transition-[color,background-color,border-color,transform] duration-200 ease-ios active:scale-95" ,
              active
                ? "border-primary bg-primary text-primary-foreground font-semibold"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}