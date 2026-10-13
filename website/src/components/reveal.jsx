import { useEffect, useRef, useState } from 'react'

/** Rises into place with a slight 3D tilt the first time it scrolls into view. */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition duration-700 ease-out transform-3d ${
        visible
          ? 'translate-y-0 rotate-x-0 opacity-100'
          : 'translate-y-8 rotate-x-12 opacity-0'
      } ${className}`}
    >
      {children}
    </Tag>
  )
}
