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
    <div className={cn('flex flex-col gap-3 border-b-2 border-border pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tighter text-foreground sm:text-5xl">{title}</h1>
          {help && <HelpHint id={help} side="bottom" />}
        </div>
        {description && <p className="max-w-2xl text-base text-muted-foreground font-medium">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
