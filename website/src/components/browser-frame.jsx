export function BrowserFrame({ url, src, alt, className = '', ...props }) {
  return (
    <figure
      className={`overflow-hidden rounded-2xl border border-line bg-white shadow-[0_40px_80px_-40px_rgb(0_0_0/0.35)] ${className}`}
      {...props}
    >
      <div className="flex h-9 items-center gap-2 border-b border-line bg-paper px-4">
        <span className="size-2.5 rounded-full bg-ink/15" />
        <span className="size-2.5 rounded-full bg-ink/15" />
        <span className="size-2.5 rounded-full bg-ink/15" />
        {url && (
          <span className="mx-auto truncate rounded-md bg-white px-3 py-0.5 font-mono text-[11px] text-subtle">
            {url}
          </span>
        )}
      </div>
      <img
        src={src}
        alt={alt}
        width={1920}
        height={1200}
        loading="lazy"
        decoding="async"
        className="block w-full"
      />
    </figure>
  )
}
