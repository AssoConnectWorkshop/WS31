"use client";

import { useMemo, useState } from "react";

/* ----------------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------------*/
type DayKey =
  | "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";
type ActivityType = "class" | "court" | "field";
type Recurrence = "daily" | "weekly" | "monthly";
type RegStatus = "registered" | "checked_in" | "cancelled";

interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  days: DayKey[];
  startTime: string;
  endTime: string;
  recurrence: Recurrence;
  startDate: string;
  endDate: string;
  spots: number;
  price: number;
  bookingOpens: number;
  cancellationDeadline: number;
  allowRecurring: boolean;
}

interface SessionT {
  id: string;
  activityId: string;
  date: Date;
  dateKey: string;
}

interface Registration {
  id: string;
  sessionId: string;
  memberName: string;
  registeredAt: string;
  status: RegStatus;
}

/* ----------------------------------------------------------------------------
 * Constants
 * --------------------------------------------------------------------------*/
const DAYS: DayKey[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];
const DAY_SHORT: Record<DayKey, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};
const DAY_JS: Record<DayKey, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 -> 20:00

const TYPE_STYLES: Record<ActivityType, { chip: string; block: string; dot: string }> = {
  class: { chip: "bg-indigo-100 text-indigo-700", block: "bg-indigo-100 border-indigo-300 text-indigo-800", dot: "bg-indigo-500" },
  court: { chip: "bg-emerald-100 text-emerald-700", block: "bg-emerald-100 border-emerald-300 text-emerald-800", dot: "bg-emerald-500" },
  field: { chip: "bg-amber-100 text-amber-700", block: "bg-amber-100 border-amber-300 text-amber-800", dot: "bg-amber-500" },
};

const MEMBERS = [
  "Alice Martin", "Bob Durand", "Chloé Petit", "David Roux", "Emma Leroy",
  "Félix Moreau", "Gabrielle Simon", "Hugo Laurent", "Inès Girard",
  "Julien Bonnet", "Karim Benali", "Léa Fontaine",
];

/* ----------------------------------------------------------------------------
 * Date / helpers
 * --------------------------------------------------------------------------*/
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function sameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}
function fmtDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function fmtDateStr(s: string): string {
  if (!s) return "";
  return fmtDate(parseDate(s));
}
function startOfWeek(d: Date): Date {
  const off = (d.getDay() + 6) % 7; // Monday-based
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -off);
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/* ----------------------------------------------------------------------------
 * Session generation
 * --------------------------------------------------------------------------*/
function generateSessions(a: Activity): SessionT[] {
  if (!a.startDate || !a.endDate) return [];
  const start = parseDate(a.startDate);
  const end = parseDate(a.endDate);
  if (end < start) return [];
  const out: SessionT[] = [];
  const push = (d: Date) => {
    out.push({ id: `${a.id}-${dateKey(d)}`, activityId: a.id, date: new Date(d), dateKey: dateKey(d) });
  };

  if (a.recurrence === "daily") {
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) push(d);
  } else if (a.recurrence === "weekly") {
    const wanted = new Set(a.days.map((k) => DAY_JS[k]));
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      if (wanted.has(d.getDay())) push(d);
    }
  } else {
    // monthly: first occurrence of each selected weekday in each month
    let y = start.getFullYear();
    let m = start.getMonth();
    while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
      for (const key of a.days) {
        const first = new Date(y, m, 1);
        const off = (DAY_JS[key] - first.getDay() + 7) % 7;
        const occ = new Date(y, m, 1 + off);
        if (occ >= start && occ <= end) push(occ);
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
  }
  return out.sort((p, q) => p.date.getTime() - q.date.getTime());
}

function countSessions(form: FormState): string {
  if (!form.startDate || !form.endDate) return "0";
  const start = parseDate(form.startDate);
  const end = parseDate(form.endDate);
  if (end < start) return "0";

  if (form.recurrence === "daily") {
    const n = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return String(Math.max(0, n));
  }
  if (form.days.length === 0) {
    return form.recurrence === "monthly" ? "—" : "0";
  }
  if (form.recurrence === "weekly") {
    const wanted = new Set(form.days.map((k) => DAY_JS[k]));
    let n = 0;
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      if (wanted.has(d.getDay())) n++;
    }
    return String(n);
  }
  // monthly
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return String(form.days.length * months);
}

/* ----------------------------------------------------------------------------
 * Mock data
 * --------------------------------------------------------------------------*/
const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1", name: "Friday Yoga", type: "class", days: ["friday"],
    startTime: "10:00", endTime: "11:00", recurrence: "weekly",
    startDate: "2025-09-05", endDate: "2026-06-26", spots: 12, price: 8,
    bookingOpens: 7, cancellationDeadline: 24, allowRecurring: true,
  },
  {
    id: "2", name: "Tennis Court A", type: "court", days: ["monday", "wednesday", "friday"],
    startTime: "09:00", endTime: "10:00", recurrence: "weekly",
    startDate: "2025-09-01", endDate: "2026-06-30", spots: 4, price: 5,
    bookingOpens: 3, cancellationDeadline: 12, allowRecurring: false,
  },
];

function buildMockRegistrations(sessions: SessionT[], activities: Activity[], today: Date): Registration[] {
  const regs: Registration[] = [];
  for (const act of activities) {
    const own = sessions.filter((s) => s.activityId === act.id);
    const past = own.filter((s) => s.date < today).slice(-6);
    const upcoming = own.filter((s) => s.date >= today).slice(0, 3);

    const seed = (sess: SessionT, isPast: boolean) => {
      const h = hashStr(sess.id);
      const count = Math.max(2, 1 + (h % act.spots));
      const offset = h % MEMBERS.length;
      for (let i = 0; i < count; i++) {
        const member = MEMBERS[(offset + i) % MEMBERS.length];
        const hh = hashStr(sess.id + member);
        let status: RegStatus;
        if (isPast) status = hh % 4 === 0 ? "registered" : "checked_in"; // ~75% attended
        else status = hh % 5 === 0 ? "checked_in" : "registered";
        regs.push({
          id: `${sess.id}-${i}`,
          sessionId: sess.id,
          memberName: member,
          registeredAt: fmtDate(addDays(sess.date, -(act.bookingOpens))),
          status,
        });
      }
    };
    past.forEach((s) => seed(s, true));
    upcoming.forEach((s) => seed(s, false));
  }
  return regs;
}

const TODAY = new Date();
const INITIAL_SESSIONS = MOCK_ACTIVITIES.flatMap(generateSessions);
const INITIAL_REGS = buildMockRegistrations(INITIAL_SESSIONS, MOCK_ACTIVITIES, TODAY);

/* ----------------------------------------------------------------------------
 * Form state
 * --------------------------------------------------------------------------*/
interface FormState {
  name: string;
  type: ActivityType;
  days: DayKey[];
  startTime: string;
  endTime: string;
  recurrence: Recurrence;
  startDate: string;
  endDate: string;
  spots: string;
  price: string;
  bookingOpens: number;
  cancellationDeadline: number;
  allowRecurring: boolean;
  step: "form" | "confirmation";
}
const EMPTY_FORM: FormState = {
  name: "", type: "class", days: [], startTime: "", endTime: "",
  recurrence: "weekly", startDate: "", endDate: "", spots: "", price: "",
  bookingOpens: 7, cancellationDeadline: 24, allowRecurring: false, step: "form",
};

/* ----------------------------------------------------------------------------
 * Icons
 * --------------------------------------------------------------------------*/
function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

/* ----------------------------------------------------------------------------
 * Main component
 * --------------------------------------------------------------------------*/
export default function ActivityScheduler() {
  const [activities, setActivities] = useState<Activity[]>(MOCK_ACTIVITIES);
  const [registrations, setRegistrations] = useState<Registration[]>(INITIAL_REGS);
  const [view, setView] = useState<"list" | "calendar" | "create">("list");
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rulesOpen, setRulesOpen] = useState(false);

  const sessions = useMemo(
    () => activities.flatMap(generateSessions),
    [activities]
  );
  const actById = useMemo(() => {
    const m: Record<string, Activity> = {};
    activities.forEach((a) => { m[a.id] = a; });
    return m;
  }, [activities]);

  const spotsLeft = (s: SessionT): number => {
    const act = actById[s.activityId];
    const taken = registrations.filter((r) => r.sessionId === s.id && r.status !== "cancelled").length;
    return act.spots - taken;
  };

  const visibleSessions = useMemo(
    () => activityFilter === "all" ? sessions : sessions.filter((s) => s.activityId === activityFilter),
    [sessions, activityFilter]
  );

  /* ---- form helpers ---- */
  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const toggleDay = (d: DayKey) =>
    setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));

  const sessionCount = countSessions(form);

  const handleFinish = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Activity name is required";
    if (form.recurrence !== "daily" && form.days.length === 0) e.days = "Select at least one day";
    if (!form.startTime) e.startTime = "Start time is required";
    if (!form.endTime) e.endTime = "End time is required";
    if (form.startTime && form.endTime && form.endTime <= form.startTime) e.endTime = "End must be after start";
    if (!form.startDate) e.startDate = "Start date is required";
    if (!form.endDate) e.endDate = "End date is required";
    if (form.startDate && form.endDate && parseDate(form.endDate) < parseDate(form.startDate)) e.endDate = "End must be after start";
    if (!form.spots || Number(form.spots) <= 0) e.spots = "Spots per session is required";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    commitActivity();
    update({ step: "confirmation" });
  };

  const commitActivity = (): Activity => {
    const a: Activity = {
      id: String(Date.now()),
      name: form.name.trim(),
      type: form.type,
      days: form.recurrence === "daily" ? [] : form.days,
      startTime: form.startTime,
      endTime: form.endTime,
      recurrence: form.recurrence,
      startDate: form.startDate,
      endDate: form.endDate,
      spots: Number(form.spots),
      price: form.price ? Number(form.price) : 0,
      bookingOpens: form.bookingOpens,
      cancellationDeadline: form.cancellationDeadline,
      allowRecurring: form.allowRecurring,
    };
    setActivities((prev) => prev.some((x) => x.id === a.id) ? prev : [...prev, a]);
    return a;
  };

  /* ---- check-in actions ---- */
  const toggleCheckIn = (regId: string) =>
    setRegistrations((prev) => prev.map((r) =>
      r.id === regId
        ? { ...r, status: r.status === "checked_in" ? "registered" : "checked_in" }
        : r
    ));
  const checkInAll = (sessionId: string) =>
    setRegistrations((prev) => prev.map((r) =>
      r.sessionId === sessionId && r.status !== "cancelled" ? { ...r, status: "checked_in" } : r
    ));

  const selectedSession = selectedSessionId ? sessions.find((s) => s.id === selectedSessionId) ?? null : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="font-bold text-lg mr-auto">🏛️ NPO Admin</span>
          <nav className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView("list")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "list" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}
            >
              ☰ Vue liste
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "calendar" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}
            >
              📅 Vue calendrier
            </button>
          </nav>
          <button
            onClick={() => { setView("create"); setForm(EMPTY_FORM); setErrors({}); }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            ➕ Créer une activité
          </button>
        </div>
      </header>

      {view === "create" ? (
        <CreateView
          form={form}
          errors={errors}
          rulesOpen={rulesOpen}
          sessionCount={sessionCount}
          onUpdate={update}
          onToggleDay={toggleDay}
          onToggleRules={() => setRulesOpen((v) => !v)}
          onFinish={handleFinish}
          onCancel={() => { setForm(EMPTY_FORM); setErrors({}); setView("list"); }}
          onReset={() => { setForm(EMPTY_FORM); setErrors({}); }}
          onGoCalendar={() => { setView("list"); }}
        />
      ) : view === "list" ? (
        <ListView
          activities={activities}
          sessions={sessions}
          registrations={registrations}
          actById={actById}
          spotsLeft={spotsLeft}
          onSelectSession={setSelectedSessionId}
        />
      ) : (
        <CalendarView
          sessions={visibleSessions}
          activities={activities}
          actById={actById}
          spotsLeft={spotsLeft}
          calendarMode={calendarMode}
          setCalendarMode={setCalendarMode}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          activityFilter={activityFilter}
          setActivityFilter={setActivityFilter}
          onSelectSession={setSelectedSessionId}
        />
      )}

      {selectedSession && (
        <SessionPanel
          session={selectedSession}
          activity={actById[selectedSession.activityId]}
          sessions={sessions}
          registrations={registrations}
          spotsLeft={spotsLeft}
          onToggleCheckIn={toggleCheckIn}
          onCheckInAll={checkInAll}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Create view (form + confirmation)
 * --------------------------------------------------------------------------*/
interface CreateProps {
  form: FormState;
  errors: Record<string, string>;
  rulesOpen: boolean;
  sessionCount: string;
  onUpdate: (p: Partial<FormState>) => void;
  onToggleDay: (d: DayKey) => void;
  onToggleRules: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onReset: () => void;
  onGoCalendar: () => void;
}

function CreateView(p: CreateProps) {
  const { form } = p;

  if (form.step === "confirmation") {
    return (
      <div className="max-w-[560px] mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-lg mb-4">
            ✅ Activity created
          </div>
          <h2 className="text-2xl font-bold">{form.name} <span className="text-gray-400 font-normal text-base capitalize">— {form.type}</span></h2>
          <div className="mt-5 space-y-2.5 text-sm">
            <p>📅 Every {form.recurrence === "daily" ? "day" : form.days.map((d) => DAY_SHORT[d]).join(", ")} at {form.startTime}–{form.endTime}</p>
            <p>🔁 <span className="capitalize">{form.recurrence}</span> · {fmtDateStr(form.startDate)} → {fmtDateStr(form.endDate)}</p>
            <p>📊 {countSessions(form)} sessions · {form.spots} spots each</p>
            <p>💶 {form.price && Number(form.price) > 0 ? `${form.price}€ per session` : "Free"}</p>
            <p>⏱ Booking opens {form.bookingOpens} days before · Cancellation up to {form.cancellationDeadline}h before</p>
            <p>♻️ Recurring subscriptions: {form.allowRecurring ? "Yes" : "No"}</p>
          </div>
          <div className="mt-7 flex gap-3">
            <button
              onClick={p.onReset}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
            >
              Create another activity
            </button>
            <button
              onClick={p.onGoCalendar}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Go to calendar →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const err = (k: string) => p.errors[k];
  const inputCls = (k: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 ${err(k) ? "border-red-400" : "border-gray-300"}`;

  return (
    <div className="max-w-[560px] mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7">
        <h2 className="text-xl font-bold mb-1">Create an activity</h2>
        <p className="text-sm text-gray-400 mb-6">Configure a recurring activity and generate every session at once.</p>

        {/* Basics */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Activity name</label>
            <input
              className={inputCls("name")}
              placeholder="e.g. Friday Yoga, Tennis Court A"
              value={form.name}
              onChange={(e) => p.onUpdate({ name: e.target.value })}
            />
            {err("name") && <p className="text-xs text-red-500 mt-1">{err("name")}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Activity type</label>
            <select className={inputCls("type")} value={form.type} onChange={(e) => p.onUpdate({ type: e.target.value as ActivityType })}>
              <option value="class">Class</option>
              <option value="court">Court</option>
              <option value="field">Field</option>
            </select>
          </div>
        </div>

        {/* Schedule */}
        <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">Schedule</h3>
        <div>
          <label className="block text-sm font-medium mb-1">Day(s) of week</label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => p.onToggleDay(d)}
                disabled={form.recurrence === "daily"}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 ${
                  form.days.includes(d) ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-300 text-gray-600"
                }`}
              >
                {DAY_SHORT[d]}
              </button>
            ))}
          </div>
          {err("days") && <p className="text-xs text-red-500 mt-1">{err("days")}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start time</label>
            <input type="time" className={inputCls("startTime")} value={form.startTime} onChange={(e) => p.onUpdate({ startTime: e.target.value })} />
            {err("startTime") && <p className="text-xs text-red-500 mt-1">{err("startTime")}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End time</label>
            <input type="time" className={inputCls("endTime")} value={form.endTime} onChange={(e) => p.onUpdate({ endTime: e.target.value })} />
            {err("endTime") && <p className="text-xs text-red-500 mt-1">{err("endTime")}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Recurrence</label>
          <select className={inputCls("recurrence")} value={form.recurrence} onChange={(e) => p.onUpdate({ recurrence: e.target.value as Recurrence })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Planning period */}
        <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">Planning period</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Start date</label>
            <input type="date" className={inputCls("startDate")} value={form.startDate} onChange={(e) => p.onUpdate({ startDate: e.target.value })} />
            {err("startDate") && <p className="text-xs text-red-500 mt-1">{err("startDate")}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End date</label>
            <input type="date" className={inputCls("endDate")} value={form.endDate} onChange={(e) => p.onUpdate({ endDate: e.target.value })} />
            {err("endDate") && <p className="text-xs text-red-500 mt-1">{err("endDate")}</p>}
          </div>
        </div>
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-sm font-semibold px-3 py-1.5 rounded-full">
            → {p.sessionCount} sessions will be generated
          </span>
        </div>

        {/* Capacity */}
        <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">Capacity</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Spots per session</label>
            <input type="number" min={1} className={inputCls("spots")} placeholder="e.g. 12" value={form.spots} onChange={(e) => p.onUpdate({ spots: e.target.value })} />
            {err("spots") && <p className="text-xs text-red-500 mt-1">{err("spots")}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price per session (€)</label>
            <input type="number" min={0} className={inputCls("price")} placeholder="0 = free" value={form.price} onChange={(e) => p.onUpdate({ price: e.target.value })} />
          </div>
        </div>

        {/* Booking rules accordion */}
        <div className="mt-6 border border-gray-200 rounded-lg">
          <button type="button" onClick={p.onToggleRules} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700">
            Booking rules
            <Chevron open={p.rulesOpen} />
          </button>
          {p.rulesOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Booking opens</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.bookingOpens} onChange={(e) => p.onUpdate({ bookingOpens: Number(e.target.value) })}>
                  {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days before</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cancellation deadline</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.cancellationDeadline} onChange={(e) => p.onUpdate({ cancellationDeadline: Number(e.target.value) })}>
                  {[2, 12, 24, 48, 72].map((h) => <option key={h} value={h}>{h}h before</option>)}
                </select>
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium">Allow recurring subscriptions</span>
                <button
                  type="button"
                  onClick={() => p.onUpdate({ allowRecurring: !form.allowRecurring })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.allowRecurring ? "bg-indigo-600" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.allowRecurring ? "translate-x-5" : ""}`} />
                </button>
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-7">
          <button onClick={p.onCancel} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={p.onFinish} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">Finish</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * List view
 * --------------------------------------------------------------------------*/
interface ListViewProps {
  activities: Activity[];
  sessions: SessionT[];
  registrations: Registration[];
  actById: Record<string, Activity>;
  spotsLeft: (s: SessionT) => number;
  onSelectSession: (id: string) => void;
}

function ListView(p: ListViewProps) {
  const today = new Date();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {p.activities.length === 0 && (
        <div className="text-center text-gray-400 py-24 text-sm">
          No activities yet. Click &ldquo;Créer une activité&rdquo; to get started.
        </div>
      )}
      {p.activities.map((a) => {
        const actSessions = p.sessions
          .filter((s) => s.activityId === a.id)
          .sort((x, y) => x.date.getTime() - y.date.getTime());
        const upcoming = actSessions.filter((s) => s.date >= today).slice(0, 5);
        const past = actSessions.filter((s) => s.date < today).slice(-3).reverse();

        const regCount = p.registrations.filter(
          (r) => actSessions.some((s) => s.id === r.sessionId) && r.status !== "cancelled"
        ).length;

        return (
          <div key={a.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Activity header */}
            <div className={`px-5 py-4 flex items-start justify-between border-b border-gray-100 ${TYPE_STYLES[a.type].block}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${TYPE_STYLES[a.type].dot}`} />
                  <h2 className="font-bold text-lg">{a.name}</h2>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[a.type].chip}`}>{a.type}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {a.days.map((d) => DAY_SHORT[d]).join(", ")} · {a.startTime}–{a.endTime} · {a.recurrence}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fmtDateStr(a.startDate)} → {fmtDateStr(a.endDate)} · {a.spots} spots · {a.price > 0 ? `${a.price}€` : "Free"}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="text-2xl font-extrabold text-gray-700">{actSessions.length}</div>
                <div className="text-xs text-gray-400">sessions</div>
                <div className="text-xs text-gray-500 mt-1">{regCount} registrations</div>
              </div>
            </div>

            {/* Upcoming sessions */}
            {upcoming.length > 0 && (
              <div className="px-5 py-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Upcoming sessions</h3>
                <div className="space-y-1.5">
                  {upcoming.map((s) => {
                    const left = p.spotsLeft(s);
                    const full = left <= 0;
                    const regs = p.registrations.filter((r) => r.sessionId === s.id && r.status !== "cancelled");
                    return (
                      <button
                        key={s.id}
                        onClick={() => p.onSelectSession(s.id)}
                        className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${full ? "bg-gray-300" : TYPE_STYLES[a.type].dot}`} />
                          <div>
                            <p className="text-sm font-semibold">{fmtDate(s.date)}</p>
                            <p className="text-xs text-gray-400">{a.startTime}–{a.endTime}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold">{regs.length}/{a.spots}</p>
                            <p className="text-xs text-gray-400">{full ? "Full" : `${left} left`}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past sessions summary */}
            {past.length > 0 && (
              <div className="px-5 pb-4 border-t border-gray-100 pt-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Recent past sessions</h3>
                <div className="flex gap-2 flex-wrap">
                  {past.map((s) => {
                    const regs = p.registrations.filter((r) => r.sessionId === s.id && r.status !== "cancelled");
                    const ci = regs.filter((r) => r.status === "checked_in").length;
                    return (
                      <button
                        key={s.id}
                        onClick={() => p.onSelectSession(s.id)}
                        className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 text-xs transition-colors"
                      >
                        <span className="text-gray-500">{MONTHS[s.date.getMonth()]} {s.date.getDate()}</span>
                        <span className="font-semibold text-emerald-600">{ci}/{regs.length} ✓</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {upcoming.length === 0 && past.length === 0 && (
              <div className="px-5 py-4 text-sm text-gray-400">No sessions generated yet.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Calendar view
 * --------------------------------------------------------------------------*/
interface CalendarProps {
  sessions: SessionT[];
  activities: Activity[];
  actById: Record<string, Activity>;
  spotsLeft: (s: SessionT) => number;
  calendarMode: "week" | "month";
  setCalendarMode: (m: "week" | "month") => void;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  activityFilter: string;
  setActivityFilter: (s: string) => void;
  onSelectSession: (id: string) => void;
}

function CalendarView(p: CalendarProps) {
  const weekStart = startOfWeek(p.currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigate = (dir: number) => {
    p.setCurrentDate(p.calendarMode === "week"
      ? addDays(p.currentDate, dir * 7)
      : new Date(p.currentDate.getFullYear(), p.currentDate.getMonth() + dir, 1));
  };

  const label = p.calendarMode === "week"
    ? `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`
    : `${["January","February","March","April","May","June","July","August","September","October","November","December"][p.currentDate.getMonth()]} ${p.currentDate.getFullYear()}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-100">‹ Previous</button>
          <span className="font-semibold text-sm min-w-[200px] text-center">{label}</span>
          <button onClick={() => navigate(1)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-100">Next ›</button>
          <button onClick={() => p.setCurrentDate(new Date())} className="px-3 py-1.5 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50">Today</button>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={p.activityFilter}
            onChange={(e) => p.setActivityFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="all">All activities</option>
            {p.activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(["week", "month"] as const).map((m) => (
              <button
                key={m}
                onClick={() => p.setCalendarMode(m)}
                className={`px-3 py-1 rounded-md text-sm font-medium capitalize ${p.calendarMode === m ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {p.calendarMode === "week"
        ? <WeekGrid {...p} weekDays={weekDays} />
        : <MonthGrid {...p} />}

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-gray-500">
        {(["class", "court", "field"] as ActivityType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${TYPE_STYLES[t].dot}`} /> <span className="capitalize">{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function WeekGrid(p: CalendarProps & { weekDays: Date[] }) {
  const sessionsByCell: Record<string, SessionT[]> = {};
  for (const s of p.sessions) {
    const act = p.actById[s.activityId];
    if (!act) continue;
    const hour = Number(act.startTime.split(":")[0]);
    const key = `${dateKey(s.date)}-${hour}`;
    (sessionsByCell[key] ||= []).push(s);
  }
  const today = new Date();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <div className="min-w-[760px]">
        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
          <div className="border-b border-gray-200" />
          {p.weekDays.map((d, i) => (
            <div key={i} className={`border-b border-l border-gray-200 px-2 py-2 text-center ${sameDay(d, today) ? "bg-indigo-50" : ""}`}>
              <div className="text-xs text-gray-400">{DAY_SHORT[DAYS[i]]}</div>
              <div className={`text-sm font-semibold ${sameDay(d, today) ? "text-indigo-600" : ""}`}>{d.getDate()}</div>
            </div>
          ))}
        </div>
        {/* Time rows */}
        {HOURS.map((h) => (
          <div key={h} className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
            <div className="text-[11px] text-gray-400 text-right pr-2 py-1 border-b border-gray-100">{String(h).padStart(2, "0")}:00</div>
            {p.weekDays.map((d, i) => {
              const cell = sessionsByCell[`${dateKey(d)}-${h}`] || [];
              return (
                <div key={i} className="border-l border-b border-gray-100 min-h-[52px] p-1 space-y-1">
                  {cell.map((s) => {
                    const act = p.actById[s.activityId];
                    const left = p.spotsLeft(s);
                    const full = left <= 0;
                    return (
                      <button
                        key={s.id}
                        onClick={() => p.onSelectSession(s.id)}
                        className={`w-full text-left rounded-md border px-1.5 py-1 text-[11px] leading-tight ${full ? "bg-gray-100 border-gray-200 text-gray-400" : TYPE_STYLES[act.type].block}`}
                      >
                        <div className="font-semibold truncate">{act.name}</div>
                        {full
                          ? <span className="inline-block mt-0.5 px-1 rounded bg-gray-300 text-gray-600 text-[10px]">Full</span>
                          : <div className="opacity-80">{left}/{act.spots} left</div>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthGrid(p: CalendarProps) {
  const first = new Date(p.currentDate.getFullYear(), p.currentDate.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const month = p.currentDate.getMonth();
  const today = new Date();

  const byDay: Record<string, SessionT[]> = {};
  for (const s of p.sessions) (byDay[dateKey(s.date)] ||= []).push(s);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7">
        {DAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-gray-400 border-b border-gray-200">{DAY_SHORT[d]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const day = (byDay[dateKey(d)] || []).sort((a, b) => {
            const ha = Number(p.actById[a.activityId]?.startTime.split(":")[0] ?? 0);
            const hb = Number(p.actById[b.activityId]?.startTime.split(":")[0] ?? 0);
            return ha - hb;
          });
          return (
            <div key={i} className={`min-h-[96px] border-b border-l border-gray-100 p-1.5 ${inMonth ? "" : "bg-gray-50"}`}>
              <div className={`text-xs mb-1 ${sameDay(d, today) ? "font-bold text-indigo-600" : inMonth ? "text-gray-600" : "text-gray-300"}`}>{d.getDate()}</div>
              <div className="space-y-0.5">
                {day.slice(0, 3).map((s) => {
                  const act = p.actById[s.activityId];
                  return (
                    <button
                      key={s.id}
                      onClick={() => p.onSelectSession(s.id)}
                      className={`w-full text-left rounded px-1 py-0.5 text-[10px] truncate ${TYPE_STYLES[act.type].chip}`}
                    >
                      {act.startTime} {act.name}
                    </button>
                  );
                })}
                {day.length > 3 && (
                  <button onClick={() => p.onSelectSession(day[3].id)} className="text-[10px] text-indigo-500 px-1">+ {day.length - 3} more</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Session detail panel
 * --------------------------------------------------------------------------*/
interface PanelProps {
  session: SessionT;
  activity: Activity;
  sessions: SessionT[];
  registrations: Registration[];
  spotsLeft: (s: SessionT) => number;
  onToggleCheckIn: (id: string) => void;
  onCheckInAll: (sessionId: string) => void;
  onClose: () => void;
}

function SessionPanel(p: PanelProps) {
  const [tab, setTab] = useState<"reg" | "history">("reg");
  const { session, activity } = p;
  const regs = p.registrations.filter((r) => r.sessionId === session.id);
  const active = regs.filter((r) => r.status !== "cancelled");
  const left = p.spotsLeft(session);

  // Attendance history: past sessions of same activity
  const today = new Date();
  const pastSessions = p.sessions
    .filter((s) => s.activityId === activity.id && s.date < today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const historyRows = pastSessions.map((s) => {
    const r = p.registrations.filter((x) => x.sessionId === s.id && x.status !== "cancelled");
    const checkedIn = r.filter((x) => x.status === "checked_in").length;
    const registered = r.length;
    return { date: s.date, registered, checkedIn, absent: registered - checkedIn };
  }).filter((row) => row.registered > 0);

  const avg = historyRows.length
    ? Math.round(historyRows.reduce((sum, r) => sum + (r.checkedIn / r.registered), 0) / historyRows.length * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={p.onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-[slideIn_0.2s_ease]">
        {/* Header */}
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${TYPE_STYLES[activity.type].dot}`} />
                <h2 className="text-lg font-bold">{activity.name}</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {fmtDate(session.date)} · {activity.startTime}–{activity.endTime}
              </p>
              <p className="text-sm text-gray-500">{active.length}/{activity.spots} spots filled{left <= 0 ? " · Full" : ""}</p>
            </div>
            <button onClick={p.onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setTab("reg")} className={`flex-1 py-1.5 rounded-md text-sm font-medium ${tab === "reg" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}>Registrations</button>
            <button onClick={() => setTab("history")} className={`flex-1 py-1.5 rounded-md text-sm font-medium ${tab === "history" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}>Attendance history</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "reg" ? (
            active.length === 0 ? (
              <div className="text-center text-gray-400 py-16">
                <div className="text-4xl mb-2">📭</div>
                No registrations yet
              </div>
            ) : (
              <>
                <button onClick={() => p.onCheckInAll(session.id)} className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">
                  ✓ Check in all
                </button>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase">
                    <span>Member</span><span>Status</span>
                  </div>
                  {regs.map((r) => (
                    <div key={r.id} className="grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2.5 border-t border-gray-100">
                      <div>
                        <div className="text-sm font-medium">{r.memberName}</div>
                        <div className="text-[11px] text-gray-400">Registered {r.registeredAt}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.status === "cancelled" ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-400">Cancelled</span>
                        ) : r.status === "checked_in" ? (
                          <button onClick={() => p.onToggleCheckIn(r.id)} className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-700 font-medium">✓ Checked in</button>
                        ) : (
                          <button onClick={() => p.onToggleCheckIn(r.id)} className="px-2.5 py-1 rounded-lg text-[11px] border border-gray-300 hover:bg-gray-50 font-medium">Check in</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            historyRows.length === 0 ? (
              <div className="text-center text-gray-400 py-16">No past sessions yet</div>
            ) : (
              <>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-4 gap-1 px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase">
                    <span>Date</span><span className="text-center">Reg.</span><span className="text-center">In</span><span className="text-center">Absent</span>
                  </div>
                  {historyRows.map((row, i) => (
                    <div key={i} className="grid grid-cols-4 gap-1 px-3 py-2 border-t border-gray-100 text-sm">
                      <span className="text-xs">{MONTHS[row.date.getMonth()]} {row.date.getDate()}</span>
                      <span className="text-center">{row.registered}</span>
                      <span className="text-center text-emerald-600 font-medium">{row.checkedIn}</span>
                      <span className="text-center text-rose-500">{row.absent}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-sm">
                  {historyRows.length <= 1 ? (
                    <p className="text-gray-600">{historyRows.length} past session · Not enough history yet for averages</p>
                  ) : (
                    <p className="font-semibold text-indigo-700">{historyRows.length} sessions · Avg. {avg}% attendance</p>
                  )}
                </div>
              </>
            )
          )}
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}
