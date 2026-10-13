import { Eraser } from 'lucide-react'
import { useRef, type PointerEvent, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { SIGNATURE_INK } from '@/lib/signature'

const WIDTH = 1200
const HEIGHT = 400

/** Freehand pad for mouse, pen and touch. The parent reads the canvas on save. */
export function SignaturePad({
  canvasRef,
  hasInk,
  onInkChange,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  hasInk: boolean
  onInkChange: (hasInk: boolean) => void
}) {
  const last = useRef<{ x: number; y: number } | null>(null)

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) * WIDTH) / rect.width,
      y: ((event.clientY - rect.top) * HEIGHT) / rect.height,
    }
  }

  const stroke = (to: { x: number; y: number }) => {
    const context = canvasRef.current?.getContext('2d')
    if (!context || !last.current) return
    context.strokeStyle = SIGNATURE_INK
    context.lineWidth = 5
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(last.current.x, last.current.y)
    context.lineTo(to.x, to.y)
    context.stroke()
    last.current = to
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    onInkChange(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-muted/30 relative rounded-md border border-dashed">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          aria-label="Signature pad. Draw your signature here."
          className="aspect-3/1 w-full cursor-crosshair touch-none dark:invert"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            last.current = point(event)
            // A dot for a single tap.
            stroke({ x: last.current.x + 0.1, y: last.current.y })
            onInkChange(true)
          }}
          onPointerMove={(event) => {
            if (last.current) stroke(point(event))
          }}
          onPointerUp={() => (last.current = null)}
          onPointerCancel={() => (last.current = null)}
        />
        <div className="border-border pointer-events-none absolute inset-x-6 bottom-6 border-b" />
        {!hasInk && (
          <p className="text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center text-sm">
            Sign here with your mouse, pen or finger
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-end"
        onClick={clear}
        disabled={!hasInk}
      >
        <Eraser /> Clear
      </Button>
    </div>
  )
}
