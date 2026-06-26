'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function ThemeHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      if (initial === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) {
    return (
      <header className="w-full h-24 border-b-4 border-black bg-white dark:border-white dark:bg-black transition-colors" />
    );
  }

  const isHome = pathname === '/';

  return (
    <header className="w-full border-b-4 border-border bg-bg-card text-text-main p-4 flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors select-none">
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
        {!isHome ? (
          <button
            onClick={() => router.push('/')}
            type="button"
            className="flex items-center gap-2 bg-secondary text-white font-black px-6 py-4 rounded-xl border-4 border-border shadow-md active:scale-95 transition-all text-base tracking-wider"
          >
            <span>🏠</span> MENÚ PRINCIPAL
          </button>
        ) : (
          <div className="flex items-center gap-2 font-black text-2xl tracking-tight">
            <span>🏗️</span> OBRAFIRMADA
          </div>
        )}

        {isHome && (
          <span className="text-xs font-bold uppercase tracking-[0.25em] px-3 py-1 bg-success text-white rounded-lg border-2 border-border">
            ✅ PRODUCCIÓN
          </span>
        )}
      </div>

      <div className="w-full sm:w-auto flex justify-end">
        <button
          onClick={toggleTheme}
          type="button"
          className="w-full sm:w-auto flex items-center justify-center gap-3 bg-secondary text-white font-black px-8 py-5 rounded-xl border-4 border-border shadow-lg active:scale-95 transition-all text-lg tracking-widest"
          aria-label="Alternar tema de pantalla"
        >
          {theme === 'light' ? (
            <>
              <span>🌙</span> MODO NOCHE
            </>
          ) : (
            <>
              <span>☀️</span> MODO SOL
            </>
          )}
        </button>
      </div>
    </header>
  );
}
