import { NavLink } from "react-router"
import { Home, CalendarDays, Dumbbell, User } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/program", label: "Program", icon: CalendarDays },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/profile", label: "Profile", icon: User },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}