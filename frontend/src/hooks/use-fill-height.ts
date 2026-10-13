import { type RefObject, useLayoutEffect } from 'react'

/** Sizes an element to reach the bottom of the viewport, inside the main padding. */
export function useFillHeight(
  ref: RefObject<HTMLElement | null>,
  minHeight = 240,
) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const update = () => {
      const top = element.getBoundingClientRect().top + window.scrollY
      const main = element.closest('main')
      const bottom = main
        ? Number.parseFloat(getComputedStyle(main).paddingBottom)
        : 0
      const height = Math.max(window.innerHeight - top - bottom, minHeight)
      element.style.height = `${height}px`
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(document.body)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [ref, minHeight])
}
