import { useSyncExternalStore } from 'react'

/**
 * Whether the backend just refused a change because the signed-in account is view-only
 * (the public demo account). The admin client reports every such 403 here, so one message
 * covers every save, publish and approve button, including the ones whose feature shows no
 * error of its own. The message hides itself after a few seconds.
 */
const SHOW_MS = 5000

let visible = false
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function set(next: boolean) {
  visible = next
  listeners.forEach((listener) => listener())
}

export function noteViewOnlyRefusal() {
  clearTimeout(timer)
  set(true)
  timer = setTimeout(() => set(false), SHOW_MS)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const read = () => visible

export function useViewOnlyRefusalVisible(): boolean {
  return useSyncExternalStore(subscribe, read, read)
}
