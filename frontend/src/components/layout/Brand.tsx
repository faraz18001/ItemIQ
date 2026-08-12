import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="ItemIQ Logo" 
      className={cn("size-10 object-contain", className)} 
    />
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
