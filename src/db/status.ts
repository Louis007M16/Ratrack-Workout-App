import { create } from "zustand"

type Status = { error: string | null; fail: (m: string) => void; clear: () => void }

export const useDbStatus = create<Status>()((set) => ({
  error: null,
  fail: (m: string) => set({ error: m }),
  clear: () => set({ error: null }),
}))