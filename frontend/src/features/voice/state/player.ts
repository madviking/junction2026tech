// One shared audio player for the whole app: starting a clip stops the one before it.
// Buttons subscribe with usePlayerState(owner) and see only their own state.
import { useSyncExternalStore } from 'react'

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error'

interface Snapshot {
  owner: string | null
  status: PlayerStatus
}

let snapshot: Snapshot = { owner: null, status: 'idle' }
let audio: HTMLAudioElement | null = null
// Increases with every play/stop, so late results of an older request are ignored.
let generation = 0
const listeners = new Set<() => void>()

function set(next: Snapshot) {
  snapshot = next
  listeners.forEach((l) => l())
}

function element(): HTMLAudioElement {
  audio ??= new Audio()
  return audio
}

function halt() {
  if (!audio) return
  audio.onended = null
  audio.onerror = null
  audio.pause()
}

/**
 * Plays the clip for `owner`. `resolveUrl` looks up the audio URL (may hit the network);
 * pressing another button meanwhile wins.
 */
export async function play(owner: string, resolveUrl: () => Promise<string>): Promise<void> {
  halt()
  const mine = ++generation
  set({ owner, status: 'loading' })
  try {
    const url = await resolveUrl()
    if (mine !== generation) return
    const el = element()
    el.onended = () => {
      if (mine === generation) set({ owner: null, status: 'idle' })
    }
    el.onerror = () => {
      if (mine === generation) set({ owner, status: 'error' })
    }
    el.src = url
    await el.play()
    if (mine === generation) set({ owner, status: 'playing' })
  } catch (_err) {
    if (mine !== generation) return
    halt()
    set({ owner, status: 'error' })
  }
}

/** Stops playback. With `owner`, only when that owner is the one playing or loading. */
export function stop(owner?: string) {
  if (owner !== undefined && snapshot.owner !== owner) return
  generation++
  halt()
  set({ owner: null, status: 'idle' })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The player state as seen by one button: idle unless this owner holds the player. */
export function usePlayerState(owner: string): PlayerStatus {
  return useSyncExternalStore(subscribe, () => (snapshot.owner === owner ? snapshot.status : 'idle'))
}

/** Test helper: forget the shared element and state between tests. */
export function resetPlayerForTests() {
  halt()
  audio = null
  generation++
  snapshot = { owner: null, status: 'idle' }
}
