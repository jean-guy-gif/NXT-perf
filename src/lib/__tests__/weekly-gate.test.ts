import { describe, it, expect } from "vitest";
import { getWeeklyGateState, shouldNotifyManager } from "../weekly-gate";
import type { WeeklyGateInput, ManagerNotificationInput } from "../weekly-gate";

// Helper: create a date for a specific day of week
// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
function makeDate(dayOfWeek: number, weekOffset = 0): Date {
  // Start from a known Monday: 2026-03-30
  const base = new Date("2026-03-30T10:00:00");
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days from Monday
  base.setDate(base.getDate() + diff + weekOffset * 7);
  return base;
}

function friday(weekOffset = 0) { return makeDate(5, weekOffset); }
function monday(weekOffset = 0) { return makeDate(1, weekOffset); }
function tuesday(weekOffset = 0) { return makeDate(2, weekOffset); }
function wednesday(weekOffset = 0) { return makeDate(3, weekOffset); }
function thursday(weekOffset = 0) { return makeDate(4, weekOffset); }
function saturday(weekOffset = 0) { return makeDate(6, weekOffset); }

// A date string for "this week's Monday" relative to a given date
function mondayStr(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split("T")[0];
}

// A date string for "last week's Monday"
function lastMondayStr(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split("T")[0];
}

const baseInput: WeeklyGateInput = {
  isDemo: false,
  isDevForced: false,
  role: "conseiller",
  lastWeeklySubmissionDate: null,
};

describe("getWeeklyGateState", () => {
  // ── Demo mode ──────────────────────────────────────────────────────────

  it("demo mode → gate always shown regardless of day", () => {
    for (const day of [monday(), tuesday(), wednesday(), thursday(), friday(), saturday()]) {
      const result = getWeeklyGateState({ ...baseInput, isDemo: true, today: day });
      expect(result.showGate).toBe(true);
      expect(result.context).toBe("demo");
    }
  });

  // ── Friday ─────────────────────────────────────────────────────────────

  it("Friday without submission → gate shown (friday_required)", () => {
    const result = getWeeklyGateState({ ...baseInput, today: friday() });
    expect(result.showGate).toBe(true);
    expect(result.context).toBe("friday_required");
    expect(result.submissionStatus).toBe("pending");
    expect(result.showResumeButton).toBe(true);
  });

  it("Friday with submission this week → gate NOT shown", () => {
    const today = friday();
    const result = getWeeklyGateState({
      ...baseInput,
      lastWeeklySubmissionDate: mondayStr(today), // submitted this week
      today,
    });
    expect(result.showGate).toBe(false);
    expect(result.context).toBe("none");
    expect(result.submissionStatus).toBe("done");
  });

  // ── Monday ─────────────────────────────────────────────────────────────

  it("Monday after missed Friday → gate shown (monday_catchup)", () => {
    const result = getWeeklyGateState({
      ...baseInput,
      lastWeeklySubmissionDate: null, // never submitted
      today: monday(),
    });
    expect(result.showGate).toBe(true);
    expect(result.context).toBe("monday_catchup");
    expect(result.submissionStatus).toBe("overdue");
  });

  it("Monday after Friday submitted → gate NOT shown", () => {
    const today = monday();
    const result = getWeeklyGateState({
      ...baseInput,
      lastWeeklySubmissionDate: lastMondayStr(today), // submitted last week
      today,
    });
    expect(result.showGate).toBe(false);
    expect(result.context).toBe("none");
    expect(result.submissionStatus).toBe("done");
  });

  // ── Tuesday–Thursday ───────────────────────────────────────────────────

  it("Tuesday → gate NOT shown", () => {
    const result = getWeeklyGateState({ ...baseInput, today: tuesday() });
    expect(result.showGate).toBe(false);
  });

  it("Wednesday → gate NOT shown", () => {
    const result = getWeeklyGateState({ ...baseInput, today: wednesday() });
    expect(result.showGate).toBe(false);
  });

  it("Thursday → gate NOT shown", () => {
    const result = getWeeklyGateState({ ...baseInput, today: thursday() });
    expect(result.showGate).toBe(false);
  });

  // ── Role filtering ─────────────────────────────────────────────────────

  it("directeur role → gate NOT shown even on Friday", () => {
    const result = getWeeklyGateState({ ...baseInput, role: "directeur", today: friday() });
    expect(result.showGate).toBe(false);
  });

  it("manager role → gate shown on Friday without submission", () => {
    const result = getWeeklyGateState({ ...baseInput, role: "manager", today: friday() });
    expect(result.showGate).toBe(true);
  });

  // ── Dev force ──────────────────────────────────────────────────────────

  it("isDevForced → gate always shown", () => {
    const result = getWeeklyGateState({ ...baseInput, isDevForced: true, today: wednesday() });
    expect(result.showGate).toBe(true);
    expect(result.context).toBe("friday_required");
  });

  // ── Resume button ──────────────────────────────────────────────────────

  it("Tuesday without submission → resume button shown, gate not shown", () => {
    const result = getWeeklyGateState({ ...baseInput, today: tuesday() });
    expect(result.showGate).toBe(false);
    expect(result.showResumeButton).toBe(true);
  });

  it("Tuesday with submission → no resume button", () => {
    const today = tuesday();
    const result = getWeeklyGateState({
      ...baseInput,
      lastWeeklySubmissionDate: mondayStr(today),
      today,
    });
    expect(result.showResumeButton).toBe(false);
  });
});

describe("shouldNotifyManager", () => {
  it("Monday, agent has no submission last week → should notify", () => {
    const result = shouldNotifyManager({
      agentLastSubmissionDate: null,
      today: monday(),
    });
    expect(result).toBe(true);
  });

  it("Monday, agent submitted last week → should NOT notify", () => {
    const today = monday();
    const result = shouldNotifyManager({
      agentLastSubmissionDate: lastMondayStr(today),
      today,
    });
    expect(result).toBe(false);
  });

  it("Friday → never notify (only Monday)", () => {
    const result = shouldNotifyManager({
      agentLastSubmissionDate: null,
      today: friday(),
    });
    expect(result).toBe(false);
  });

  it("Tuesday → never notify", () => {
    const result = shouldNotifyManager({
      agentLastSubmissionDate: null,
      today: tuesday(),
    });
    expect(result).toBe(false);
  });
});
