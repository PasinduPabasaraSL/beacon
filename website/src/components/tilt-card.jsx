import { useRef } from 'react'
import { prefersReducedMotion } from '@/lib/site'

const MAX_TILT = 7

/** A card that leans toward the pointer in 3D, with a soft light highlight. */
export function TiltCard({ className = '', children }) {
  const ref = useRef(null)

  const onPointerMove = (event) => {
    const node = ref.current
    if (!node || event.pointerType !== 'mouse' || prefersReducedMotion()) return
    const rect = node.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    node.style.setProperty('--rx', `${(0.5 - y) * MAX_TILT * 2}deg`)
    node.style.setProperty('--ry', `${(x - 0.5) * MAX_TILT * 2}deg`)
    node.style.setProperty('--gx', `${x * 100}%`)
    node.style.setProperty('--gy', `${y * 100}%`)
  }

  const reset = () => {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }

  return (
    <div className="h-full perspective-[1200px]">
      <div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={reset}
        style={{
          transform:
            'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateZ(0)',
        }}
        className={`group relative h-full overflow-hidden rounded-3xl border border-line bg-white transition-[transform,box-shadow] duration-300 ease-out transform-3d hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.25)] ${className}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(400px circle at var(--gx, 50%) var(--gy, 50%), color-mix(in oklch, var(--color-beam) 14%, transparent), transparent 60%)',
          }}
        />
        {children}
      </div>
    </div>
  )
}
