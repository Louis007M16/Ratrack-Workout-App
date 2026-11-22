import { create } from "zustand"

export type TimerMode = "rest" | "stopwatch"

type State = {
  mode: TimerMode
  restSeconds: number
  running: boolean
  startedAt: number
  baseMs: number
  setMode: (m: TimerMode) => void
  setRest: (seconds: number) => void
  toggle: () => void
  reset: () => void
  startRest: () => void
  finish: () => void
}

export const elapsedMs = (t: Pick<State, "running" | "startedAt" | "baseMs">, now: number) =>
  t.baseMs + (t.running ? now - t.startedAt : 0)

export const useTimerStore = create<State>()((set, get) => ({
  mode: "rest",
  restSeconds: 180,
  running: false,
  startedAt: 0,
  baseMs: 0,

  setMode: (mode: TimerMode) => set({ mode, running: false, baseMs: 0 }),
  setRest: (seconds: number) =>
    set({ restSeconds: Math.min(1800, Math.max(15, seconds)), mode: "rest", running: false, baseMs: 0 }),

  toggle: () => {
    const t = get()
    const now = Date.now()
    if (t.running) {
      set({ running: false, baseMs: elapsedMs(t, now) })
      return
    }
    const finished = t.mode === "rest" && t.baseMs >= t.restSeconds * 1000
    set({ running: true, startedAt: now, baseMs: finished ? 0 : t.baseMs })
  },
  reset: () => set({ running: false, baseMs: 0 }),
  startRest: () => set({ mode: "rest", running: true, startedAt: Date.now(), baseMs: 0 }),
  finish: () => set((s) => ({ running: false, baseMs: s.restSeconds * 1000 })),
}))