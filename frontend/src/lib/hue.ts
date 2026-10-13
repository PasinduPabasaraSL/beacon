const HUES = [72, 250, 150, 300, 25, 195, 340, 110]

/** A stable oklch hue for an identifier, so a project or person keeps its colour everywhere. */
export function hueFor(seed: string): number {
  let hash = 2166136261
  for (const char of seed) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return HUES[hash % HUES.length]
}
