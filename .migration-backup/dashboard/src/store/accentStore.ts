type Accent = 'emerald' | 'blue' | 'purple' | 'teal' | 'orange' | 'rose';

const ACCENT_KEY = 'sentinel-accent';
const ACCENT_CLASSES = ['accent-blue', 'accent-purple', 'accent-teal', 'accent-orange', 'accent-rose'];

function applyAccent(accent: Accent) {
  const root = document.documentElement;
  ACCENT_CLASSES.forEach(c => root.classList.remove(c));
  if (accent !== 'emerald') {
    root.classList.add(`accent-${accent}`);
  }
}

export function getStoredAccent(): Accent {
  try {
    const v = localStorage.getItem(ACCENT_KEY) as Accent | null;
    if (v && ['emerald', 'blue', 'purple', 'teal', 'orange', 'rose'].includes(v)) return v;
  } catch {}
  return 'emerald';
}

export function setAccent(accent: Accent) {
  try { localStorage.setItem(ACCENT_KEY, accent); } catch {}
  applyAccent(accent);
}

export type { Accent };

// Apply on module load
applyAccent(getStoredAccent());
