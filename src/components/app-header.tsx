'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';

const THEMES = ['light', 'dark'] as const;
const ACCENTS = ['blue', 'red', 'green', 'orange'] as const;
type Theme = typeof THEMES[number];
type Accent = typeof ACCENTS[number];

export function AppHeader() {
  const [theme, setTheme] = useState<Theme>('light');
  const [accent, setAccent] = useState<Accent>('blue');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem('theme') as Theme) || 'light';
    const a = (localStorage.getItem('accent') as Accent) || 'blue';
    applyTheme(t, a);
    setTheme(t);
    setAccent(a);
  }, []);

  const applyTheme = (t: Theme, a: Accent) => {
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-accent', a);
    localStorage.setItem('theme', t);
    localStorage.setItem('accent', a);
  };

  return (
    <header
      className="
        sticky top-0 z-50
        border-b border-border
        bg-background/90 backdrop-blur
        supports-[backdrop-filter]:bg-background/75
        text-foreground
        w-full
      "
    >
      <div className="mx-auto max-w-3xl px-6 py-3 flex items-center justify-between">
        <div className="font-semibold">To-Do</div>

        <div className="flex items-center gap-2">
          {/* (Opcional) placeholders de auth */}
          <Button size="sm" variant="ghost" type="button" onClick={() => alert('Log in (optional)')}>
            Log in
          </Button>
          <Button size="sm" type="button" onClick={() => alert('Sign up (optional)')}>
            Sign up
          </Button>

          {/* Settings (abre modal) */}
          <Button
            size="icon"
            variant="outline"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Settings"
            className="border-border"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Modal Settings */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Theme</label>
              <select
                aria-label="Theme"
                value={theme}
                onChange={(e) => {
                  const t = e.target.value as Theme;
                  setTheme(t);
                  applyTheme(t, accent);
                }}
                className="
                  rounded-md border border-border px-2 py-1 text-sm
                  bg-card text-foreground
                  focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
                "
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Accent</label>
              <select
                aria-label="Accent"
                value={accent}
                onChange={(e) => {
                  const a = e.target.value as Accent;
                  setAccent(a);
                  applyTheme(theme, a);
                }}
                className="
                  rounded-md border border-border px-2 py-1 text-sm
                  bg-card text-foreground
                  focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
                "
              >
                {ACCENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <Button type="button" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
