import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, KeyRound, LogOut, Menu, Search, X } from 'lucide-react';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { ICONS } from '@/components/common/icons';
import { ChangePasswordDialog } from '@/components/common/ChangePasswordDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { navForSession, ROLE_META } from '@/data/roles';
import { initials, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { session, logout } = useAuth();
  const { notifications, markAllRead, error, refresh } = useData();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (!session) return null;
  const nav = navForSession(session.role, session.roles ?? []);
  const roleMeta = ROLE_META[session.role];
  // The API already scopes notifications to the signed-in user.
  const myNotifs = notifications;
  const unread = myNotifs.filter((n) => !n.isRead).length;

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <NavLink to={roleMeta.home}>
          <Brand />
        </NavLink>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="issue-label px-3 pb-1 pt-2 text-muted-foreground">
          {roleMeta.label}
        </p>
        {nav.map((item) => {
          const Icon = ICONS[item.icon];
          const isBell = item.icon === 'bell';
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              {Icon && <Icon className={cn('size-4.5 shrink-0', 'group-aria-[current=page]:text-primary')} strokeWidth={1.75} />}
              <span className="flex-1">{item.label}</span>
              {isBell && unread > 0 && (
                <Badge variant="critical" className="px-1.5">{unread}</Badge>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar>
            <AvatarFallback style={{ background: `color-mix(in oklab, ${roleMeta.color}, transparent 82%)`, color: roleMeta.color }}>
              {initials(session.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session.name}</p>
            <p className="truncate text-xs text-muted-foreground">{roleMeta.label}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void onLogout()} aria-label="Sign out" title="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar shadow-xl">
            <Button
              variant="ghost" size="icon"
              className="absolute right-2 top-3.5"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </Button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>

          <button
            onClick={() => navigate('/app/bank')}
            className="hidden max-w-sm flex-1 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
          >
            <Search className="size-4" />
            <span>Search the question bank…</span>
            <kbd className="ml-auto rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell
              unread={unread}
              items={myNotifs}
              onOpenAll={() => navigate('/app/notifications')}
              onMarkAll={() => void markAllRead()}
            />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-8">
                    <AvatarFallback style={{ background: `color-mix(in oklab, ${roleMeta.color}, transparent 82%)`, color: roleMeta.color }}>
                      {initials(session.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{session.name}</span>
                    <span className="text-xs text-muted-foreground">{session.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(roleMeta.home)}>Workspace</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                  <KeyRound className="size-4" /> Change password
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => void onLogout()}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">
          {/* A backend outage must be visible — otherwise every screen just
              renders convincingly empty. */}
          {error && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-critical/40 bg-critical/8 p-4 text-sm">
              <AlertTriangle className="size-4 shrink-0 text-critical" />
              <span className="flex-1">{error}</span>
              <Button size="sm" variant="outline" onClick={() => void refresh()}>Retry</Button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
}

function NotificationBell({
  unread, items, onOpenAll, onMarkAll,
}: {
  unread: number;
  items: ReturnType<typeof useData>['notifications'];
  onOpenAll: () => void;
  onMarkAll: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-critical ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={onMarkAll}>
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
        ) : (
          items.slice(0, 5).map((n) => (
            <div key={n.id} className="flex gap-2 px-3 py-2 text-sm">
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.isRead ? 'bg-border' : 'bg-primary')} />
              <div className="min-w-0">
                <p className="line-clamp-2 text-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </div>
            </div>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenAll} className="justify-center text-primary">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
