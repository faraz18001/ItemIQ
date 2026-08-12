import { Link, NavLink, Outlet } from 'react-router-dom';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
];

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        {/* Issue row — the editorial masthead's dateline */}
        <div className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 sm:px-6">
            <p className="issue-label text-muted-foreground">Sindh Institute of Urology &amp; Transplantation</p>
            <p className="issue-label hidden text-muted-foreground sm:block">Examinations · ItemIQ</p>
          </div>
        </div>

        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/"><Brand /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login">Open workspace</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <Brand />
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                Question intelligence for the Sindh Institute of Urology &amp; Transplantation — one
                measured difficulty tag per item, defended in every review meeting.
              </p>
            </div>
            <nav className="flex gap-10">
              <div className="space-y-2">
                <p className="issue-label text-muted-foreground">Explore</p>
                {LINKS.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end} className="block text-sm text-foreground/80 hover:text-foreground">
                    {l.label}
                  </NavLink>
                ))}
              </div>
              <div className="space-y-2">
                <p className="issue-label text-muted-foreground">Access</p>
                <Link to="/login" className="block text-sm text-foreground/80 hover:text-foreground">Sign in</Link>
                <Link to="/login" className="block text-sm text-foreground/80 hover:text-foreground">Open workspace</Link>
              </div>
            </nav>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="issue-label text-muted-foreground">© {new Date().getFullYear()} SIUT · ItemIQ</p>
            <p className="issue-label text-muted-foreground">Demonstration build</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
