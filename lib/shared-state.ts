"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Drop-in replacement for `useLocalStorage` that ALSO syncs to a shared
 * `app_state` table in Supabase so every browser sees the same value.
 *
 * Strategy:
 *   1. Mount → read from localStorage first (instant paint, no flash)
 *   2. Mount → fetch from Supabase, overlay if newer (server wins on first load)
 *   3. Local change → write to localStorage immediately + debounced upsert to Supabase
 *   4. Realtime subscription → if another browser updates the row, pull it in
 *
 * Falls back gracefully to localStorage-only if Supabase isn't reachable
 * (e.g. when the migration hasn't been applied yet).
 */
export function useSyncedState<T>(
  key: string,
  initial: T,
  options: { debounceMs?: number; subscribe?: boolean } = {},
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const { debounceMs = 500, subscribe = true } = options;
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWriteRef = useRef<string>("");
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createSupabaseBrowserClient>["channel"]
  > | null>(null);

  // Read from localStorage first (instant), then from Supabase (authoritative)
  useEffect(() => {
    let cancelled = false;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        try {
          setValue(JSON.parse(raw) as T);
        } catch {
          // ignore
        }
      }
    } catch {
      // localStorage unavailable
    }
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("app_state")
          .select("value")
          .eq("key", key)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data?.value !== undefined && data.value !== null) {
          const serialized = JSON.stringify(data.value);
          if (serialized !== lastWriteRef.current) {
            setValue(data.value as T);
            try {
              window.localStorage.setItem(key, serialized);
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        // Supabase unreachable or table missing → stick with localStorage value
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Realtime subscription — other browsers' updates flow in
  useEffect(() => {
    if (!subscribe) return;
    let cleanup: (() => void) | null = null;
    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`app_state:${key}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_state", filter: `key=eq.${key}` },
          (payload) => {
            const next = (payload.new as { value?: unknown } | null)?.value;
            if (next === undefined || next === null) return;
            const serialized = JSON.stringify(next);
            if (serialized === lastWriteRef.current) return; // it was our own write
            setValue(next as T);
            try {
              window.localStorage.setItem(key, serialized);
            } catch {
              /* ignore */
            }
          },
        )
        .subscribe();
      channelRef.current = channel;
      cleanup = () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // realtime unavailable — non-fatal
    }
    return () => {
      cleanup?.();
    };
  }, [key, subscribe]);

  // Setter — writes localStorage instantly, then debounce-upserts to Supabase
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        const serialized = JSON.stringify(resolved);
        lastWriteRef.current = serialized;
        try {
          window.localStorage.setItem(key, serialized);
        } catch {
          /* ignore */
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          try {
            const supabase = createSupabaseBrowserClient();
            await supabase.from("app_state").upsert({
              key,
              value: resolved as unknown as object,
              updated_at: new Date().toISOString(),
            });
          } catch {
            // Supabase write failed — local copy still saved
          }
        }, debounceMs);
        return resolved;
      });
    },
    [key, debounceMs],
  );

  return [value, set, hydrated];
}
