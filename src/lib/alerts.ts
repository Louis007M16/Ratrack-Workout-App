import { create } from "zustand"
import { persist } from "zustand/middleware"

type Pref = "sound" | "vibrate" | "notify"
type Prefs = Record<Pref, boolean> & { update: (p: Partial<Record<Pref, boolean>>) => void }

export const useAlertPrefs = create<Prefs>()(
  persist(
    (set) => ({ sound: true, vibrate: true, notify: false, update: (p) => set(p) }),
    { name: "ratrack-alerts" }
  )
)

let ctx: AudioContext | null = null

// browsers only allow sound after a tap, so this runs on every tap (cheap)
export function unlockAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx ??= new Ctor()
    if (ctx.state === "suspended") void ctx.resume()
  } catch {
    /* audio not available */
  }
}

function beep(freq: number, at: number, length: number) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

function chime() {
  if (!ctx) return
  const t = ctx.currentTime
  beep(880, t, 0.18)
  beep(880, t + 0.28, 0.18)
  beep(1175, t + 0.56, 0.35)
}

export async function enableNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported"
  return Notification.requestPermission() // must be called from a tap
}

async function showNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, tag: "rest-timer" })
      return
    }
    new Notification(title, { body, tag: "rest-timer" })
  } catch {
    /* some browsers only allow notifications through a service worker */
  }
}

export function alertDone(force = false) {
  const p = useAlertPrefs.getState()
  if (p.sound) chime()
  if (p.vibrate) navigator.vibrate?.([300, 150, 300, 150, 300])
  if ((p.notify && document.visibilityState === "hidden") || force) {
    void showNotification("Rest over", "Time for your next set.")
  }
}