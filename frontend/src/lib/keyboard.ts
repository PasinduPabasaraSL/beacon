const isApple = /Mac|iPhone|iPad/.test(navigator.userAgent)

/** Label for a Ctrl/Cmd shortcut, e.g. shortcutLabel('K') is "⌘K" on a Mac. */
export function shortcutLabel(key: string): string {
  return isApple ? `⌘${key}` : `Ctrl ${key}`
}
