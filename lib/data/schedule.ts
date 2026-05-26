import { PROJECT_STATUSES, type ProjectStatus } from "@/types/db";

export type PhaseDurations = {
  "ร่าง TOR": number;
  "เปิดโครงการ": number;
  "ยื่นโครงการ": number;
  "กำลังดำเนินงาน": number;
};

export const DEFAULT_DURATIONS: PhaseDurations = {
  "ร่าง TOR": 14,
  "เปิดโครงการ": 7,
  "ยื่นโครงการ": 30,
  "กำลังดำเนินงาน": 60,
};

// Parse "2569-Q1" → Date (calendar year convention: Q1=Jan-Mar, Q2=Apr-Jun,
// Q3=Jul-Sep, Q4=Oct-Dec). BE → CE conversion: subtract 543.
export function quarterStartDate(q: string | undefined): Date | null {
  if (!q) return null;
  const m = q.match(/^(\d{4})-Q([1-4])$/);
  if (!m) return null;
  const beYear = parseInt(m[1], 10);
  const ceYear = beYear - 543;
  const quarter = parseInt(m[2], 10);
  const month = (quarter - 1) * 3; // Q1 → 0 (Jan), Q2 → 3 (Apr), ...
  return new Date(ceYear, month, 1);
}

export function formatQuarter(q: string | undefined): string {
  if (!q) return "—";
  return q.replace("-", " ");
}

export type ScheduleInfo = {
  startDate: Date | null;
  daysSinceStart: number; // negative = not started yet
  expectedStatus: ProjectStatus;
  expectedIndex: number;
  currentIndex: number;
  delta: number; // currentIndex - expectedIndex
  daysIntoCurrentPhase: number;
  phaseLengthDays: number;
  state: "not_started" | "on_track" | "ahead" | "due_soon" | "late" | "done";
};

export function scheduleFor(
  startQ: string | undefined,
  currentStatus: ProjectStatus,
  durations: PhaseDurations,
  today: Date = new Date(),
): ScheduleInfo {
  const startDate = quarterStartDate(startQ);
  const currentIndex = PROJECT_STATUSES.indexOf(currentStatus);

  if (!startDate) {
    return {
      startDate: null,
      daysSinceStart: 0,
      expectedStatus: "ร่าง TOR",
      expectedIndex: 0,
      currentIndex,
      delta: 0,
      daysIntoCurrentPhase: 0,
      phaseLengthDays: 0,
      state: "not_started",
    };
  }

  const daysSinceStart = Math.floor(
    (today.getTime() - startDate.getTime()) / 86_400_000,
  );

  // Build cumulative end-of-phase day markers.
  const phases: Array<{ status: ProjectStatus; endDay: number; length: number }> = [];
  let cumulative = 0;
  for (const p of PROJECT_STATUSES) {
    const len = p === "เสร็จสิ้น" ? Infinity : (durations[p as keyof PhaseDurations] ?? 0);
    cumulative += len;
    phases.push({ status: p, endDay: cumulative, length: len });
  }

  // Find expected phase by cumulative day.
  let expectedIndex = 0;
  for (let i = 0; i < phases.length; i += 1) {
    if (daysSinceStart < phases[i].endDay) {
      expectedIndex = i;
      break;
    }
    expectedIndex = i;
  }
  if (currentStatus === "เสร็จสิ้น") {
    return {
      startDate,
      daysSinceStart,
      expectedStatus: phases[expectedIndex].status,
      expectedIndex,
      currentIndex,
      delta: currentIndex - expectedIndex,
      daysIntoCurrentPhase: 0,
      phaseLengthDays: 0,
      state: "done",
    };
  }
  if (daysSinceStart < 0) {
    return {
      startDate,
      daysSinceStart,
      expectedStatus: "ร่าง TOR",
      expectedIndex: 0,
      currentIndex,
      delta: currentIndex,
      daysIntoCurrentPhase: 0,
      phaseLengthDays: 0,
      state: "not_started",
    };
  }

  const expectedPhase = phases[expectedIndex];
  const startOfExpected = expectedIndex === 0 ? 0 : phases[expectedIndex - 1].endDay;
  const daysIntoExpected = daysSinceStart - startOfExpected;
  const phaseLengthDays = expectedPhase.length;

  const delta = currentIndex - expectedIndex;
  let state: ScheduleInfo["state"];
  if (delta < 0) {
    state = "late";
  } else if (delta > 0) {
    state = "ahead";
  } else {
    // on the expected phase — flag "due_soon" if >70% through current phase
    const ratio = phaseLengthDays === Infinity ? 0 : daysIntoExpected / phaseLengthDays;
    state = ratio > 0.7 ? "due_soon" : "on_track";
  }

  return {
    startDate,
    daysSinceStart,
    expectedStatus: expectedPhase.status,
    expectedIndex,
    currentIndex,
    delta,
    daysIntoCurrentPhase: daysIntoExpected,
    phaseLengthDays,
    state,
  };
}

export const STATE_LABEL: Record<ScheduleInfo["state"], string> = {
  not_started: "ยังไม่ถึงวันเริ่ม",
  on_track: "ตามแผน",
  ahead: "ทำเร็วกว่าแผน",
  due_soon: "ใกล้ครบกำหนด",
  late: "ล่าช้า — ต้องตามด่วน",
  done: "เสร็จแล้ว",
};

export const STATE_COLOR: Record<ScheduleInfo["state"], string> = {
  not_started: "#94a3b8",
  on_track: "#15803d",
  ahead: "#0369a1",
  due_soon: "#d97706",
  late: "#dc2626",
  done: "#10b981",
};

export function formatThaiDate(d: Date | null): string {
  if (!d) return "—";
  const beYear = d.getFullYear() + 543;
  const month = d.toLocaleDateString("th-TH", { month: "short" });
  return `${d.getDate()} ${month} ${beYear}`;
}
