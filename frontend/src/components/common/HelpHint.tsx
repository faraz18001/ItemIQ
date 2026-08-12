import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HELP, type HelpId } from '@/data/help';
import { cn } from '@/lib/utils';

interface HelpHintProps {
  /** Key into the HELP registry in `@/data/help`. */
  id: HelpId;
  className?: string;
  /** Where the panel opens. Defaults to the right of the marker. */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * The `?` marker that explains a feature on hover.
 *
 * Rendered as a real <button> rather than a bare icon so it is reachable by
 * keyboard and announced to screen readers — Radix opens the panel on focus as
 * well as hover, which is the only reason this is usable without a mouse.
 * `type="button"` matters: several of these sit inside forms, and the default
 * submit type would post the form on click.
 *
 * The panel overrides the base tooltip styling deliberately. The default is a
 * one-line inverted chip; this is a four-section paragraph block, so it uses
 * popover colours and a fixed width instead of shrink-to-fit.
 */
export function HelpHint({ id, className, side = 'right' }: HelpHintProps) {
  const entry = HELP[id];
  if (!entry) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`What is this? ${entry.what}`}
          className={cn(
            'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
            'text-muted-foreground/70 transition-colors',
            'hover:text-foreground focus-visible:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            className,
          )}
        >
          <HelpCircle className="size-4" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align="start"
        collisionPadding={12}
        className={cn(
          'w-80 max-w-[min(20rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-border',
          'bg-popover p-3 text-popover-foreground shadow-lg',
        )}
      >
        <p className="text-xs font-medium leading-relaxed">{entry.what}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{entry.how}</p>

        <dl className="space-y-1.5 border-t border-border pt-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Where the data comes from
            </dt>
            <dd className="text-xs leading-relaxed">{entry.data}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Who can access it
            </dt>
            <dd className="text-xs leading-relaxed">{entry.access}</dd>
          </div>
        </dl>

        {entry.caveat && (
          <p className="rounded-md bg-[color-mix(in_oklab,var(--color-warning),transparent_88%)] px-2 py-1.5 text-xs leading-relaxed text-warning">
            {entry.caveat}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
