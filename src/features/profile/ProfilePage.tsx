import { useEffect, useRef, useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { ChevronRight, ChartNoAxesColumn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { downloadBackup, eraseEverything, exportAll, importAll, parseBackup, type Parsed } from "@/db/backup"
import { useProfile } from "./useProfile"
import { alertDone, enableNotifications, unlockAudio, useAlertPrefs } from "@/lib/alerts"

const initials = (n: string) =>
  n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"

const daysSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="rounded-2xl border border-border bg-card p-4">{children}</div>
    </section>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const p = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)

  const [draftName, setDraftName] = useState("")
  const [nameError, setNameError] = useState("")
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [erasing, setErasing] = useState(false)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => setDraftName(p.name), [p.name])
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

const alerts = useAlertPrefs()
const [permission, setPermission] = useState<string>(() =>
  typeof Notification === "undefined" ? "unsupported" : Notification.permission
)
const turnOnNotifications = async () => {
  const res = await enableNotifications()
  setPermission(res)
  alerts.update({ notify: res === "granted" })
}

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  const saveName = async () => {
    const v = draftName.trim()
    if (v.length < 1) return setNameError("Enter your name")
    if (v.length > 30) return setNameError("Keep it under 30 characters")
    await p.saveName(v)
    setNameError("")
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const doExport = async () => {
    setBusy(true)
    setMessage("")
    try {
      downloadBackup(await exportAll())
      await p.markBackup()
      setMessage("Backup saved. Check your Downloads or Files app.")
    } catch {
      setMessage("Couldn't create the backup. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 50 * 1024 * 1024) return setParsed({ ok: false, error: "That file is too large to be a backup." })
    setParsed(parseBackup(await file.text()))
    if (fileRef.current) fileRef.current.value = ""
  }

  const doImport = async () => {
    if (!parsed?.ok) return
    setBusy(true)
    try {
      await importAll(parsed.file)
      location.reload()
    } catch {
      setParsed({ ok: false, error: "Restore failed, and your current data was not changed." })
      setBusy(false)
    }
  }

  const doErase = async () => {
    setBusy(true)
    await eraseEverything()
    location.reload()
  }

  const protect = () => navigator.storage?.persist?.().then(setPersisted).catch(() => setPersisted(false))

  const ago = daysSince(p.lastBackup)
  const stale = ago === null || ago > 14

  if (!p.ready) return <p className="mt-16 text-center text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="pb-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="mt-5 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-gold-dim text-xl font-bold text-gold" aria-hidden="true">
          {initials(p.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{p.name || "Add your name"}</p>
          <p className="text-xs text-muted-foreground">Your data stays on this device.</p>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">NAME</p>
        <label htmlFor="pname" className="sr-only">Your name</label>
        <div className="flex gap-2 mt-4 mb-8">
          <Input id="pname" maxLength={30} placeholder="Your name" value={draftName} aria-invalid={!!nameError}
            onChange={(e) => { setDraftName(e.target.value); setNameError("") }}
            onKeyDown={(e) => e.key === "Enter" && saveName()} />
          <Button onClick={saveName} disabled={draftName.trim() === p.name}>{saved ? "Saved" : "Save"}</Button>
        </div>
        {nameError && <p role="alert" className="mt-1.5 text-sm text-destructive">{nameError}</p>}


      <button type="button" onClick={() => navigate("/profile/progress")}
        className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-primary/50 bg-gold-dim p-4 text-left transition-transform duration-200 ease-ios active:scale-[0.99]">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ChartNoAxesColumn className="size-5" aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Progress</span>
          <span className="block text-xs text-muted-foreground">Each workout, and how you do every month</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </button>

      <p className="mt-10 text-xs text-muted-foreground">DEFAULT UNIT</p>
      <div role="group" aria-label="Default weight unit" className="inline-flex rounded-full bg-secondary mt-4 p-1">
          {(["kg", "lbs"] as const).map((u) => (
          <button key={u} type="button" aria-pressed={p.unit === u} onClick={() => p.saveUnit(u)}
              className={cn("rounded-full px-5 py-1.5 text-sm transition-colors duration-200",
              p.unit === u ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground")}>
              {u === "kg" ? "Kg" : "Lbs"}
          </button>
          ))}
      </div>
      <p className="mt-4 mb-10 text-xs text-muted-foreground">Used as the starting unit when you create a workout.</p>

      <Card title="Timer alerts">
        {([["sound", "Sound"], ["vibrate", "Vibration"]] as const).map(([k, label]) => (
          <div key={k} className="flex items-center justify-between py-1.5">
            <span className="text-sm">{label}</span>
            <button type="button" role="switch" aria-checked={alerts[k]} aria-label={label}
              onClick={() => alerts.update(k === "sound" ? { sound: !alerts.sound } : { vibrate: !alerts.vibrate })}
              className={cn("relative h-7 w-12 rounded-full transition-colors duration-200 ease-ios", alerts[k] ? "bg-primary" : "bg-secondary")}>
              <span className={cn("absolute left-0.5 top-0.5 size-6 rounded-full transition-transform duration-200 ease-ios",
                alerts[k] ? "translate-x-5 bg-primary-foreground" : "bg-foreground")} />
            </button>
          </div>
        ))}

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-3">
          <div>
            <p className="text-sm">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {permission === "granted" ? "On" : permission === "denied" ? "Blocked in your browser settings"
                : permission === "unsupported" ? "Not available here" : "Off"}
            </p>
          </div>
          {permission === "default" && <Button size="sm" onClick={turnOnNotifications}>Turn on</Button>}
        </div>

        <Button className="mt-3" variant="outline" onClick={() => { unlockAudio(); alertDone(true) }}>Test alert</Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Alerts work while the app is open or the screen is awake. iPhones don’t support vibration, and the silent switch can mute sound.
        </p>
      </Card>


      <Card title="Your data">
        <p className="text-sm">
          {p.lastBackup
            ? `Last backup: ${new Date(p.lastBackup).toLocaleDateString(undefined, { dateStyle: "medium" })}`
            : "You haven't made a backup yet."}
        </p>
        {stale && (
          <p className="mt-1 text-xs text-gold">
            {ago === null ? "Back up now so you don't lose your progress." : `It's been ${ago} days. Time for a new backup.`}
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button size="lg" onClick={doExport} disabled={busy}>Export data</Button>
          <Button size="lg" variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>Import data</Button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])} />
        {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
        <p className="mt-3 text-xs text-muted-foreground">
          To move to a new phone, export here, send the file to the new phone, and import it there.
        </p>
      </Card>

      {persisted !== true && (
        <Card title="Protect my data">
          <p className="text-sm text-muted-foreground">
            Ask the browser not to clear this app's data when the phone runs low on space.
          </p>
          <Button className="mt-3" variant="outline" onClick={protect}>Protect my data</Button>
          {persisted === false && (
            <p className="mt-2 text-xs text-muted-foreground">
              Not granted. Adding the app to your home screen usually helps, and backups keep you safe either way.
            </p>
          )}
        </Card>
      )}

      {!standalone && (
        <Card title="Install">
          <p className="text-sm text-muted-foreground">
            On iPhone: tap the Share button in Safari, then <b>Add to Home Screen</b>. On Android: open the browser menu and tap <b>Install app</b>.
          </p>
        </Card>
      )}

      <Card title="Danger zone">
        <Button variant="destructive" onClick={() => setErasing(true)} disabled={busy}>Erase all data</Button>
        <p className="mt-2 text-xs text-muted-foreground">Removes everything from this device. Export first if you may want it back.</p>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">RATRACK v0.1 · works offline</p>

      <Drawer open={parsed !== null} onOpenChange={(o) => !o && setParsed(null)}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="px-5 pb-1 pt-3 text-left">
            <DrawerTitle>{parsed?.ok ? "Restore this backup?" : "Can't restore"}</DrawerTitle>
          </DrawerHeader>
          {parsed?.ok ? (
            <div className="px-5 text-sm text-muted-foreground">
              <p>
                Backup from {new Date(parsed.file.exportedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}:{" "}
                {parsed.summary.workouts} workouts, {parsed.summary.splits} splits, {parsed.summary.sessions} sessions, {parsed.summary.sets} logged sets.
              </p>
              <p className="mt-2 font-medium text-foreground">This replaces everything currently on this device.</p>
            </div>
          ) : (
            <p role="alert" className="px-5 text-sm text-destructive">{parsed?.error}</p>
          )}
          <div className="grid grid-cols-2 gap-3 px-5 pb-8 pt-5">
            <Button variant="secondary" size="lg" onClick={() => setParsed(null)}>{parsed?.ok ? "Cancel" : "Close"}</Button>
            {parsed?.ok && <Button size="lg" onClick={doImport} disabled={busy}>Replace data</Button>}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={erasing} onOpenChange={setErasing}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="px-5 pb-1 pt-3 text-left">
            <DrawerTitle>Erase all data?</DrawerTitle>
          </DrawerHeader>
          <p className="px-5 text-sm text-muted-foreground">Your workouts, splits and history will be removed from this device. This can't be undone.</p>
          <div className="grid grid-cols-2 gap-3 px-5 pb-8 pt-5">
            <Button variant="secondary" size="lg" onClick={() => setErasing(false)}>Cancel</Button>
            <Button variant="destructive" size="lg" onClick={doErase} disabled={busy}>Erase</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}