// The header back arrow for steps inside one journey screen (symptom cards → "how long",
// door → "what happened?", a date or route card asked before an outcome is sent). Those
// steps are local to the screen and never reach the server; while one is open, the header
// arrow goes back inside the screen instead of one step back on the path.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Register = (onBack: () => void) => () => void

const SubStepBackContext = createContext<Register | null>(null)

/** Provided by `JourneyScreen` around the stage. */
export const SubStepBackProvider = SubStepBackContext.Provider

/**
 * For `JourneyScreen`: the slot stages register into, and the back handler of the step
 * opened last (undefined while no inner step is open).
 */
export function useSubStepBackSlot(): { register: Register; current: (() => void) | undefined } {
  const [stack, setStack] = useState<Array<{ id: number; onBack: () => void }>>([])
  const nextId = useRef(0)
  const register = useCallback<Register>((onBack) => {
    const id = ++nextId.current
    setStack((entries) => [...entries, { id, onBack }])
    return () => setStack((entries) => entries.filter((entry) => entry.id !== id))
  }, [])
  return { register, current: stack.at(-1)?.onBack }
}

/**
 * For a stage: while `onBack` is set, the header arrow calls it. Returns false when the
 * component is rendered outside a journey screen (no header); render an inline back
 * button then.
 */
export function useSubStepBack(onBack: (() => void) | undefined): boolean {
  const register = useContext(SubStepBackContext)
  const latest = useRef(onBack)
  useEffect(() => {
    latest.current = onBack
  })
  const active = onBack !== undefined
  useEffect(() => {
    if (!active || !register) return undefined
    return register(() => latest.current?.())
  }, [active, register])
  return register !== null
}
