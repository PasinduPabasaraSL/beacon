import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import recordBook from '@/assets/screens/record-book.webp'
import reviews from '@/assets/screens/reviews.webp'
import timeline from '@/assets/screens/timeline.webp'
import { ButtonLink } from '@/components/button'
import { GithubIcon } from '@/components/github-icon'
import { prefersReducedMotion, REPO_URL } from '@/lib/site'

const LAYERS = [
  {
    src: timeline,
    alt: 'Semester timeline with milestones',
    className: '-translate-y-[15%] scale-[0.86]',
    depth: -140,
    veil: 'bg-white/60',
  },
  {
    src: reviews,
    alt: 'Supervisor review queue',
    className: '-translate-y-[7.5%] scale-[0.93]',
    depth: -70,
    veil: 'bg-white/35',
  },
  {
    src: recordBook,
    alt: 'Supervisor meeting record book in Beacon',
    className: '',
    depth: 0,
  },
]

/** Three app screens floating in 3D, leaning toward the pointer. */
function ScreenStack() {
  const sceneRef = useRef(null)

  const onPointerMove = (event) => {
    const scene = sceneRef.current
    if (!scene || prefersReducedMotion()) return
    const rect = scene.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    scene.style.setProperty('--tilt-x', `${16 - y * 8}deg`)
    scene.style.setProperty('--tilt-y', `${-8 + x * 12}deg`)
  }

  return (
    <div
      ref={sceneRef}
      onPointerMove={onPointerMove}
      className="relative mx-auto w-full max-w-5xl perspective-[2200px]"
    >
      {/* The lighthouse light sweeping across the floor below the screens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[38%] left-1/2 -z-10 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2 perspective-[900px]"
      >
        <div className="beam-sweep size-full animate-sweep" />
      </div>
      <div className="animate-float">
        <div
          className="relative transition-transform duration-500 ease-out transform-3d"
          style={{
            transform:
              'rotateX(var(--tilt-x, 16deg)) rotateY(var(--tilt-y, -8deg)) rotateZ(1deg)',
          }}
        >
          {LAYERS.map((layer, index) => (
            <div
              key={layer.alt}
              className={`${index === LAYERS.length - 1 ? 'relative' : 'absolute inset-0'} ${layer.className}`}
              style={{ transform: `translateZ(${layer.depth}px)` }}
            >
              <div className="relative overflow-hidden rounded-xl border border-line bg-white shadow-[0_50px_100px_-40px_rgb(0_0_0/0.45)]">
                {layer.veil && (
                  <div
                    aria-hidden
                    className={`absolute inset-0 ${layer.veil}`}
                  />
                )}
                <img
                  src={layer.src}
                  alt={layer.alt}
                  width={1920}
                  height={1200}
                  fetchPriority={index === LAYERS.length - 1 ? 'high' : 'low'}
                  className="block w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="dot-grid absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 pb-24 text-center sm:pt-24">
        <a
          href="#open-source"
          className="group mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 py-1 pr-3 pl-1 text-sm text-subtle backdrop-blur transition-colors hover:border-ink/20"
        >
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-white">
            Open source
          </span>
          Free forever, MIT licensed
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
          Keep every project{' '}
          <span className="relative whitespace-nowrap">
            <span className="relative z-10">in sight.</span>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-1 -z-0 h-4 rounded-full bg-beam/40 blur-[2px] sm:bottom-2 sm:h-5"
            />
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-subtle sm:text-xl">
          Beacon is a lightweight, open source project management platform for
          software teams and the people who guide them. Plan the work, log real
          effort and keep a signed record of every check-in, while GitHub stays
          the home of your code.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href={REPO_URL}>
            <GithubIcon /> Get it on GitHub
          </ButtonLink>
          <ButtonLink href="#features" variant="outline">
            Explore features <ArrowRight className="size-4" />
          </ButtonLink>
        </div>

        <div className="mt-20 w-full sm:mt-24">
          <ScreenStack />
        </div>
      </div>
    </section>
  )
}
