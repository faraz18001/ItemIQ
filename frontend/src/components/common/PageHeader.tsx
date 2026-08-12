import { HelpHint } from '@/components/common/HelpHint';
import type { HelpId } from '@/data/help';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  /** Shows a `?` beside the title explaining the screen. */
  help?: HelpId;
}

export function PageHeader({ title, description, children, className, help }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {help && <HelpHint id={help} side="bottom" />}
        </div>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
