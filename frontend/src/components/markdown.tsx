import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

/** Renders GitHub-flavoured Markdown. Raw HTML is ignored. */
export function Markdown({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'prose prose-sm prose-neutral dark:prose-invert max-w-none',
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-h1:border-b prose-h1:pb-2 prose-h1:text-2xl prose-h2:border-b prose-h2:pb-1.5 prose-h2:text-lg',
        'prose-a:text-brand-strong prose-a:underline-offset-2',
        'prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-muted prose-pre:text-foreground prose-pre:border',
        'prose-th:border prose-th:px-3 prose-th:py-1.5 prose-td:border prose-td:px-3 prose-td:py-1.5 prose-table:text-sm',
        'prose-img:rounded-md',
        '[&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_.task-list-item]:pl-0',
        '[&_.task-list-item_input]:accent-brand [&_.task-list-item_input]:mr-2 [&_.task-list-item_input]:align-middle',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
