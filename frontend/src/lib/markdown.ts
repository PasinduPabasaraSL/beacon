/** The first paragraph of a Markdown document as plain text, for previews. */
export function markdownExcerpt(markdown: string | null): string {
  if (!markdown) return ''
  let inFence = false
  const paragraph: string[] = []
  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const isText =
      line && !/^(#|\||>|[-*+] |\d+\. |<|!\[|---|\*\*\*)/.test(line)
    if (isText) paragraph.push(line)
    else if (paragraph.length) break
  }
  return paragraph
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|~~|`)(.+?)\1/g, '$2')
    .trim()
}
