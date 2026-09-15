import { useEffect, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Animate a number from 0 → target once, whenever the target changes. Honors
 * prefers-reduced-motion (jumps straight to the final value). Pure presentation —
 * never changes data. StrictMode-safe: the effect re-subscribes cleanly, so a
 * mount/cleanup/mount cycle still lands on the final value.
 */
export function useCountUp(target: number | null, durationMs = 900): number | null {
  const [value, setValue] = useState<number | null>(
    target === null || prefersReducedMotion() ? target : 0,
  )

  useEffect(() => {
    if (target === null || prefersReducedMotion()) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setValue(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
