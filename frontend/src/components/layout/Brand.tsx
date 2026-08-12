import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="size-5">
        <path
          d="M9 22V10h2.6v12H9Zm5.2 0V10h2.5l3 5.4 3-5.4H23v12h-2.4v-7.4l-2.6 4.6h-.2l-2.6-4.6V22h-2.4Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function Brand({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-semibold tracking-tight">
            Item<span className="text-primary">IQ</span>
          </span>
          <span className="issue-label mt-1 text-muted-foreground">SIUT</span>
        </span>
      )}
    </span>
  );
}
