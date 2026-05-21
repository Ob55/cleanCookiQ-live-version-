import { useEffect, useRef, useState } from "react";

/**
 * Drop-in replacement for useState that auto-persists to localStorage.
 * Used on long setup forms so switching tabs / accidentally navigating
 * away doesn't wipe what the user has typed. Call clearPersisted() after
 * a successful submit to remove the draft.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  // Debounced write — typing rapidly shouldn't hit localStorage on every keystroke.
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* quota or serialisation failure — silently ignore, draft is best-effort */
      }
    }, 250);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [key, value]);

  return [value, setValue];
}

export function clearPersisted(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
