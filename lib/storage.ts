"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hydration-safe wrapper around localStorage.
 *
 * Returns `[value, setter, hydrated]` — `hydrated` flips to true once we've
 * read from localStorage on the client, which lets callers avoid flashing
 * stale defaults during SSR.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore — corrupted JSON or storage unavailable
    }
    setHydrated(true);
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage full / unavailable — ignore
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set, hydrated];
}
