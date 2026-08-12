export function formatDate(iso?: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return 'N/A';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  return formatDate(iso);
}

export function pct(value?: number | null, digits = 0): string {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return `${(value * 100).toFixed(digits)}%`;
}

export function num(value?: number | null, digits = 2): string {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return Number(value).toFixed(digits);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function initials(name?: string): string {
  return (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
