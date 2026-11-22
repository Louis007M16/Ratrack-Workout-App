import { useDbStatus } from "./status"

let chain: Promise<void> = Promise.resolve()

// every database write goes through here, one at a time, in order
export function enqueue(task: () => Promise<unknown>): Promise<void> {
  chain = chain.then(task).then(
    () => undefined,
    (e: unknown) => {
      console.error("Database write failed", e)
      useDbStatus.getState().fail(String(e))
    }
  )
  return chain
}

export const flushWrites = () => chain