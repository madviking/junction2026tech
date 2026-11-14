import { useEffect, useState } from 'react'

const HOLD_MS = 2500

/** The stage to scroll to and outline; cleared after a moment so the same link works again. */
export function useHighlight() {
  const [highlighted, setHighlighted] = useState<string | null>(null)
  useEffect(() => {
    if (!highlighted) return
    const timer = setTimeout(() => setHighlighted(null), HOLD_MS)
    return () => clearTimeout(timer)
  }, [highlighted])
  return [highlighted, setHighlighted] as const
}
