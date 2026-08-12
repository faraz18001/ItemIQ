import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Button asChild className="mt-6"><Link to="/">Back to home</Link></Button>
    </div>
  );
}
