import { useEffect, useState } from "react"

export function useQuery<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({
    data: null, loading: true, error: "",
  })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fn()
      .then((data) => alive && setState({ data, loading: false, error: "" }))
      .catch((e: unknown) => alive && setState({ data: null, loading: false, error: String(e) }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}