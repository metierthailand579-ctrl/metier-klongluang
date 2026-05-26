"use client";

import { useEffect, useRef } from "react";
import { TEAM_PICKS } from "@/lib/data/team-picks";
import { useSyncedState } from "@/lib/shared-state";
import type { ProjectMeta } from "@/components/selected/selected-explorer";

const SELECTED_KEY = "khlongluang.selectedProjects.v1";
const META_KEY = "khlongluang.projectMeta.v1";

// Spread team picks across the 4 quarters of 2569 so the Timeline page has
// something to show out-of-the-box. The user can re-assign anytime.
const DEFAULT_QUARTERS = ["2569-Q1", "2569-Q2", "2569-Q3", "2569-Q4"] as const;

/**
 * Runs once on first load when the SHARED selection is empty. Drops the team's
 * recommended project IDs in + assigns default Priority/Start Q so the demo
 * pages have content immediately.
 *
 * Idempotent across browsers because the check is against the SHARED state
 * (via useSyncedState) — once any browser seeds, no other browser re-seeds.
 */
export function TeamPicksSeeder() {
  const [selected, setSelected, hydrated1] = useSyncedState<string[]>(SELECTED_KEY, []);
  const [metaMap, setMetaMap, hydrated2] = useSyncedState<Record<string, ProjectMeta>>(
    META_KEY,
    {},
  );
  const seededRef = useRef(false);

  useEffect(() => {
    if (!hydrated1 || !hydrated2) return;
    if (seededRef.current) return;
    // Only seed when the workspace is truly empty. If anyone already picked
    // anything, don't touch their work.
    if (selected.length > 0) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    setSelected(TEAM_PICKS.map((t) => t.id));
    const nextMeta = { ...metaMap };
    TEAM_PICKS.forEach((t, i) => {
      if (nextMeta[t.id]) return;
      nextMeta[t.id] = {
        priority: i < 5 ? "high" : "medium",
        start_q: DEFAULT_QUARTERS[i % DEFAULT_QUARTERS.length],
      };
    });
    setMetaMap(nextMeta);
  }, [hydrated1, hydrated2, selected, metaMap, setSelected, setMetaMap]);

  return null;
}
