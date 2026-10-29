'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ArtTheme = 'paint' | 'pixel';
export const THEME_STORAGE_KEY = 'painted-realms-theme';
type ThemeValue = { theme: ArtTheme; setTheme: (theme: ArtTheme) => void; toggleTheme: () => void };
const ThemeContext = createContext<ThemeValue>({ theme: 'paint', setTheme: () => {}, toggleTheme: () => {} });

/** Appearance is local to this browser; it never changes room or game state. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<ArtTheme>('paint');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let preferred: ArtTheme = 'paint';
    try { if (localStorage.getItem(THEME_STORAGE_KEY) === 'pixel') preferred = 'pixel'; } catch { /* Storage can be disabled; the toggle still works. */ }
    updateTheme(preferred);
    document.documentElement.dataset.theme = preferred;
    setLoaded(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = event.newValue === 'pixel' ? 'pixel' : 'paint';
      updateTheme(next);
      document.documentElement.dataset.theme = next;
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Non-persistent mode. */ }
  }, [theme, loaded]);
  const setTheme = useCallback((next: ArtTheme) => {
    if (next !== 'paint' && next !== 'pixel') return;
    updateTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);
  const toggleTheme = useCallback(() => updateTheme(current => current === 'paint' ? 'pixel' : 'paint'), []);
  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return <div className="theme-toggle" role="group" aria-label="Art style">
    <button type="button" className={theme === 'paint' ? 'selected' : ''} aria-pressed={theme === 'paint'} onClick={() => setTheme('paint')} title="Hand-painted art style">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 10 5-7 2-1 1 2-6 7M6 10c-3-2-4 1-4 4 3 0 6-1 4-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span>Paint</span>
    </button>
    <button type="button" className={theme === 'pixel' ? 'selected' : ''} aria-pressed={theme === 'pixel'} onClick={() => setTheme('pixel')} title="Pixel art style">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true"><path d="M2 2h5v5H2Zm7 0h5v5H9ZM2 9h5v5H2Zm7 0h5v5H9Z"/></svg><span>Pixel</span>
    </button>
  </div>;
}
