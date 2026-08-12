import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

interface ThemeCtx {
  mode: ThemeMode;
  resolved: Resolved;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = 'itemiq-theme';

function systemPref(): Resolved {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'light';
  });
  const [resolved, setResolved] = useState<Resolved>(() =>
    mode === 'system' ? systemPref() : (mode as Resolved),
  );

  useEffect(() => {
    const apply = () => {
      const r = mode === 'system' ? systemPref() : (mode as Resolved);
      setResolved(r);
      document.documentElement.classList.toggle('dark', r === 'dark');
      document.documentElement.style.colorScheme = r;
    };
    apply();
    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [mode]);

  const setMode = (m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    setModeState(m);
  };

  const value = useMemo<ThemeCtx>(
    () => ({ mode, resolved, setMode, toggle: () => setMode(resolved === 'dark' ? 'light' : 'dark') }),
    [mode, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
