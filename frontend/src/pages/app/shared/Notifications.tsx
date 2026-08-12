import { Bell, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/DataContext';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

const TYPE_META: Record<Notification['type'], { label: string; tone: 'good' | 'serious' | 'critical' | 'brand' }> = {
  Accepted: { label: 'Accepted', tone: 'good' },
  Correction_Required: { label: 'Correction required', tone: 'serious' },
  Rejected: { label: 'Rejected', tone: 'critical' },
  Final_Rejected: { label: 'Final rejection', tone: 'critical' },
};

export function Notifications() {
  const { notifications, markNotificationRead, markAllRead } = useData();

  // The API returns only this user's notifications.
  const mine = notifications;
  const unread = mine.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader help="notifications" title="Notifications" description="Updates on your questions as they move through review.">
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        )}
      </PageHeader>

      {mine.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
      ) : (
        <div className="space-y-2">
          {mine.map((n) => {
            const meta = TYPE_META[n.type];
            return (
              <Card
                key={n.id}
                onClick={() => void markNotificationRead(n.id)}
                className={cn(
                  'flex-row items-start gap-3 p-4 transition-colors',
                  !n.isRead ? 'cursor-pointer border-primary/30 bg-accent/30' : '',
                )}
              >
                <span className={cn('mt-1 size-2 shrink-0 rounded-full', n.isRead ? 'bg-border' : 'bg-primary')} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={meta.tone}>{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground">{n.message}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
