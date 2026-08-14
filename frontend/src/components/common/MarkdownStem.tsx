import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownStemProps {
  children: string;
  className?: string;
  /** When true, truncates to a couple of lines (for list previews) */
  truncate?: boolean;
}

/**
 * Renders question stem text as formatted Markdown.
 * Handles tables, bold, italic, line breaks, lists, etc.
 */
export function MarkdownStem({ children, className, truncate }: MarkdownStemProps) {
  if (!children) return null;

  if (truncate) {
    // For list previews, strip markdown and show plain text
    const plain = children
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/[_*~`#>\-|]/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    return <p className={cn('line-clamp-2 text-sm text-foreground', className)}>{plain}</p>;
  }

  return (
    <div className={cn('markdown-stem', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-border">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left border-b border-border">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border/50">{children}</td>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed mb-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          sup: ({ children }) => (
            <sup className="text-[0.7em]">{children}</sup>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
