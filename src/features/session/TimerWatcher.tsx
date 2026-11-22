import { useEffect, useState } from 'react';
import { alertDone } from '@/lib/alerts';
import { useTimerStore } from './useTimerStore';

export default function TimerWatcher() {
  const running = useTimerStore((s) => s.running);
  const mode = useTimerStore((s) => s.mode);
  const restSeconds = useTimerStore((s) => s.restSeconds);
  const startedAt = useTimerStore((s) => s.startedAt);
  const baseMs = useTimerStore((s) => s.baseMs);
  const [banner, setBanner] = useState(false);

  // keep the screen on while a timer runs
  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return;
    const ref: { lock: WakeLockSentinel | null } = { lock: null };
    let cancelled = false;
    const ask = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
        else ref.lock = lock;
      } catch {
        /* denied or unsupported */
      }
    };
    void ask();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void ask();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void ref.lock?.release();
    };
  }, [running]);

  // fire the alert when the rest ends, whichever tab you're on
  useEffect(() => {
    if (!running || mode !== 'rest') return;
    const endAt = startedAt + restSeconds * 1000 - baseMs;
    const fire = () => {
      const t = useTimerStore.getState();
      if (!t.running || t.mode !== 'rest' || Date.now() < endAt) return;
      t.finish();
      alertDone();
      setBanner(true);
    };
    const id = window.setTimeout(fire, Math.max(0, endAt - Date.now()));
    const onVisible = () => {
      if (document.visibilityState === 'visible') fire();
    }; // phone woke up late
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running, mode, restSeconds, startedAt, baseMs]);

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(false), 10_000);
    return () => window.clearTimeout(id);
  }, [banner]);

  if (!banner) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-[60] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg"
    >
      <span className="text-sm font-semibold">
        Rest over. Next set when you’re ready.
      </span>
      <button
        type="button"
        onClick={() => setBanner(false)}
        className="text-sm font-semibold underline"
      >
        Dismiss
      </button>
    </div>
  );
}
