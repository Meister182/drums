import { normalizeSetup, type Setup } from './model';

export type SavedSetup = {
  id: string;
  name: string;
  setup: Setup;
  savedAt: number;
};

const KEY = 'drums.setups.v1';

type Stored = { version: 1; setups: SavedSetup[] };

export function loadLibrary(): SavedSetup[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (!Array.isArray(parsed.setups)) return [];
    return parsed.setups
      .filter((item) => item && typeof item.name === 'string' && item.setup)
      .map((item) => ({
        id: String(item.id ?? crypto.randomUUID()),
        name: String(item.name),
        setup: normalizeSetup(item.setup),
        savedAt: Number(item.savedAt) || Date.now(),
      }));
  } catch {
    return [];
  }
}

function persist(setups: SavedSetup[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, setups } satisfies Stored));
  } catch {
    // storage full or disabled; the app keeps working in memory
  }
}

export function saveSetup(name: string, setup: Setup, saved: SavedSetup[]): SavedSetup[] {
  const trimmed = name.trim();
  if (!trimmed) return saved;
  const entry: SavedSetup = {
    id: saved.find((item) => item.name === trimmed)?.id ?? crypto.randomUUID(),
    name: trimmed,
    setup: normalizeSetup(setup),
    savedAt: Date.now(),
  };
  const next = [...saved.filter((item) => item.name !== trimmed), entry].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  persist(next);
  return next;
}

export function deleteSetup(id: string, saved: SavedSetup[]): SavedSetup[] {
  const next = saved.filter((item) => item.id !== id);
  persist(next);
  return next;
}
