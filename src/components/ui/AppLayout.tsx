import { Outlet, useLocation } from "react-router"
import BottomNav from "./BottomNav"
import { useDbStatus } from "@/db/status"
import { useEffect } from "react"
import TimerWatcher from "@/features/session/TimerWatcher"
import { unlockAudio } from "@/lib/alerts"


export default function AppLayout() {
  const hideNav = useLocation().pathname.startsWith("/program/schedule")
  const dbError = useDbStatus((s) => s.error)

  useEffect(() => {
    document.addEventListener("pointerdown", unlockAudio, { passive: true })
    return () => document.removeEventListener("pointerdown", unlockAudio)
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <TimerWatcher />
      {dbError && (
        <div role="alert" className="bg-destructive px-4 py-2 text-center text-xs font-medium text-white">
          A change couldn't be saved. Export a backup from Profile and restart the app.
        </div>
      )}
      <main className={hideNav ? "flex-1 px-4 pt-6 pb-8" : "flex-1 px-4 pt-6 pb-24"}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}