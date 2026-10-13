/** A handwritten signature that draws itself, pauses, then fades out and repeats. */
export function SignatureStroke({ className = '' }) {
  return (
    <svg
      viewBox="0 0 260 100"
      fill="none"
      className={className}
      role="img"
      aria-label="A signature being drawn"
    >
      <path
        pathLength="1"
        d="M14 66c10-30 22-48 30-44 9 5-8 40-14 52 12-20 26-38 33-30 6 8-10 30 0 30 9 0 18-28 26-26 7 2-6 24 3 24 8 0 14-20 22-22 9-2 2 18 11 18 9 0 15-26 24-24 8 2-4 22 6 22s20-14 30-18 20 0 36-8"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 1"
        className="animate-sign"
      />
      <path
        pathLength="1"
        d="M30 88c50-6 120-8 200-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 1"
        className="animate-sign opacity-60 [animation-delay:400ms]"
      />
    </svg>
  )
}
