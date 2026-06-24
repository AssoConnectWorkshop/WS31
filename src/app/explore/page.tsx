"use client";

import { useMemo, useState } from "react";
import {
  ACTIVITIES,
  INSTRUCTOR_TITLES,
  getUpcomingSessions,
  type Activity,
  type SessionSlot,
} from "@/data/activities";

type Tab = "explore" | "bookings";
type TypeFilter = "all" | "récurrent" | "ponctuel";

const sessionKey = (aid: number, sid: number) => `${aid}:${sid}`;

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("explore");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [hideFull, setHideFull] = useState(false);
  const [selected, setSelected] = useState<Activity | null>(null);

  // Booking state (in-memory)
  const [bookedSessions, setBookedSessions] = useState<Set<string>>(new Set());
  const [subscriptions, setSubscriptions] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACTIVITIES.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (hideFull && a.full) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.instructor.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, typeFilter, hideFull]);

  const bookingCount = bookedSessions.size + subscriptions.size;

  const toggleSession = (a: Activity, s: SessionSlot) => {
    const key = sessionKey(a.id, s.id);
    setBookedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        showToast("Réservation annulée");
      } else {
        next.add(key);
        showToast(`Réservé · ${a.name}`);
      }
      return next;
    });
  };

  const toggleSubscription = (a: Activity) => {
    setSubscriptions((prev) => {
      const next = new Set(prev);
      if (next.has(a.id)) {
        next.delete(a.id);
        showToast("Inscription annulée");
      } else {
        next.add(a.id);
        showToast(`Inscrit · ${a.name}`);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col relative">
        {/* App bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100 px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {tab === "explore" ? "Activités" : "Mes réservations"}
            </h1>
            <span className="text-2xl">🤸</span>
          </div>

          {tab === "explore" && (
            <>
              <div className="mt-3 relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher une activité, un coach…"
                  className="w-full rounded-xl bg-gray-100 border border-transparent focus:border-indigo-300 focus:bg-white px-4 py-2.5 text-sm outline-none"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {([
                  ["all", "Tout"],
                  ["récurrent", "Cours réguliers"],
                  ["ponctuel", "À la séance"],
                ] as [TypeFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTypeFilter(val)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      typeFilter === val
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setHideFull((v) => !v)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    hideFull ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Places dispo
                </button>
              </div>
            </>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-4 pb-24">
          {tab === "explore" ? (
            <>
              <p className="text-xs text-gray-400 mb-3">{filtered.length} activités</p>
              <div className="space-y-3">
                {filtered.map((a) => (
                  <ActivityCard key={a.id} activity={a} onClick={() => setSelected(a)} />
                ))}
                {filtered.length === 0 && (
                  <div className="text-center text-gray-400 py-16 text-sm">
                    Aucune activité ne correspond à votre recherche.
                  </div>
                )}
              </div>
            </>
          ) : (
            <BookingsView
              bookedSessions={bookedSessions}
              subscriptions={subscriptions}
              onCancelSession={(aid, sid) => {
                setBookedSessions((prev) => {
                  const next = new Set(prev);
                  next.delete(sessionKey(aid, sid));
                  return next;
                });
              }}
              onCancelSub={(aid) => {
                setSubscriptions((prev) => {
                  const next = new Set(prev);
                  next.delete(aid);
                  return next;
                });
              }}
              onExplore={() => setTab("explore")}
            />
          )}
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur border-t border-gray-100 grid grid-cols-2 z-20">
          <NavBtn active={tab === "explore"} icon="🧭" label="Explorer" onClick={() => setTab("explore")} />
          <NavBtn active={tab === "bookings"} icon="🎟️" label="Réservations" badge={bookingCount} onClick={() => setTab("bookings")} />
        </nav>

        {/* Detail sheet */}
        {selected && (
          <DetailSheet
            activity={selected}
            bookedSessions={bookedSessions}
            subscribed={subscriptions.has(selected.id)}
            onToggleSession={(s) => toggleSession(selected, s)}
            onToggleSub={() => toggleSubscription(selected)}
            onClose={() => setSelected(null)}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
            {toast}
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function NavBtn({ active, icon, label, onClick, badge }: {
  active: boolean; icon: string; label: string; onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 py-2.5 ${active ? "text-indigo-600" : "text-gray-400"}`}>
      <span className="relative text-xl">
        {icon}
        {badge ? (
          <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

function ActivityCard({ activity: a, onClick }: { activity: Activity; onClick: () => void }) {
  const ratio = a.totalSpots ? a.registered / a.totalSpots : 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform"
    >
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{ backgroundColor: a.accentColor }} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-[15px] leading-tight">{a.name}</h3>
            {a.full ? (
              <span className="shrink-0 text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Complet</span>
            ) : (
              <span className="shrink-0 text-[11px] font-semibold text-emerald-600">{a.totalSpots - a.registered} places</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{a.schedule} · {a.time}</p>
          <p className="text-xs text-gray-400 mt-0.5">👤 {a.instructor} · 📍 {a.location}</p>

          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: a.accentColor }}
              />
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">{a.registered}/{a.totalSpots}</span>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {a.tags.slice(0, 2).map((t) => (
                <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${a.accentColor}1a`, color: a.accentColor }}>
                  {t}
                </span>
              ))}
            </div>
            <span className="text-sm font-bold" style={{ color: a.accentColor }}>{a.price}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailSheet({ activity: a, bookedSessions, subscribed, onToggleSession, onToggleSub, onClose }: {
  activity: Activity;
  bookedSessions: Set<string>;
  subscribed: boolean;
  onToggleSession: (s: SessionSlot) => void;
  onToggleSub: () => void;
  onClose: () => void;
}) {
  const sessions = useMemo(() => getUpcomingSessions(a), [a]);
  const title = a.instructorTitle || INSTRUCTOR_TITLES[a.instructor] || "Intervenant·e";
  const isRecurring = a.type === "récurrent";

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 top-8 max-w-md mx-auto bg-white rounded-t-3xl overflow-hidden flex flex-col"
        style={{ animation: "sheetUp 0.25s ease" }}
      >
        {/* Hero */}
        <div className="relative px-5 pt-5 pb-6 text-white shrink-0" style={{ backgroundColor: a.accentColor }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">✕</button>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {isRecurring ? "Cours régulier" : "À la séance"}
          </div>
          <h2 className="text-2xl font-extrabold mt-1 pr-8">{a.name}</h2>
          <p className="text-sm opacity-90 mt-1">{a.schedule} · {a.time}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {a.tags.map((t) => (
              <span key={t} className="text-[11px] font-medium bg-white/20 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Quick facts */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Fact icon="📍" label="Lieu" value={a.location} />
            <Fact icon="💶" label="Tarif" value={a.price} />
            <Fact icon="👥" label="Places" value={a.full ? "Complet" : `${a.totalSpots - a.registered} dispo · ${a.totalSpots} max`} />
            <Fact icon="🔁" label="Séances" value={a.sessions ? `${a.sessions} / an` : "En continu"} />
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold mb-1">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{a.description}</p>
          </div>

          {/* Year content */}
          <div className="bg-gray-50 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-1">{"Au programme de l'année"}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{a.yearContent}</p>
          </div>

          {/* Instructor */}
          <div>
            <h3 className="text-sm font-bold mb-2">Intervenant·e</h3>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: a.accentColor }}>
                {a.instructor.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{a.instructor}</p>
                <p className="text-xs text-gray-400">{title}</p>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{a.instructorBio}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {a.instructorCerts.map((c) => (
                    <span key={c} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">🎓 {c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming sessions */}
          <div>
            <h3 className="text-sm font-bold mb-2">Prochaines séances</h3>
            <div className="space-y-2">
              {sessions.map((s) => {
                const key = sessionKey(a.id, s.id);
                const booked = bookedSessions.has(key);
                const left = Math.max(0, s.spotsLeft - (booked ? 1 : 0));
                const full = left <= 0 && !booked;
                return (
                  <div key={s.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{s.label}</p>
                      <p className="text-xs text-gray-400">{s.time} · {full ? "Complet" : `${left} place${left > 1 ? "s" : ""}`}</p>
                    </div>
                    <button
                      onClick={() => !full && onToggleSession(s)}
                      disabled={full}
                      className={`shrink-0 text-xs font-bold px-3.5 py-2 rounded-lg transition-colors ${
                        booked
                          ? "bg-emerald-100 text-emerald-700"
                          : full
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "text-white"
                      }`}
                      style={!booked && !full ? { backgroundColor: a.accentColor } : undefined}
                    >
                      {booked ? "✓ Réservé" : full ? "Complet" : "Réserver"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky CTA (recurring courses) */}
        {isRecurring && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-3 bg-white">
            <button
              onClick={onToggleSub}
              disabled={a.full && !subscribed}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${
                subscribed ? "bg-emerald-100 text-emerald-700" : a.full ? "bg-gray-100 text-gray-400" : "text-white"
              }`}
              style={!subscribed && !a.full ? { backgroundColor: a.accentColor } : undefined}
            >
              {subscribed ? "✓ Inscrit·e au cours" : a.full ? "Cours complet" : `M'inscrire · ${a.price}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2">
      <p className="text-[11px] text-gray-400">{icon} {label}</p>
      <p className="text-sm font-semibold mt-0.5 leading-tight">{value}</p>
    </div>
  );
}

function BookingsView({ bookedSessions, subscriptions, onCancelSession, onCancelSub, onExplore }: {
  bookedSessions: Set<string>;
  subscriptions: Set<number>;
  onCancelSession: (aid: number, sid: number) => void;
  onCancelSub: (aid: number) => void;
  onExplore: () => void;
}) {
  const subList = ACTIVITIES.filter((a) => subscriptions.has(a.id));
  const sessionList = Array.from(bookedSessions).map((key) => {
    const [aid, sid] = key.split(":").map(Number);
    const activity = ACTIVITIES.find((a) => a.id === aid);
    if (!activity) return null;
    const slot = getUpcomingSessions(activity).find((s) => s.id === sid);
    return activity && slot ? { activity, slot } : null;
  }).filter((x): x is { activity: Activity; slot: SessionSlot } => x !== null);

  if (subList.length === 0 && sessionList.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-3">🎟️</div>
        <p className="text-gray-500 text-sm">Aucune réservation pour le moment.</p>
        <button onClick={onExplore} className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
          Explorer les activités
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {subList.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Cours réguliers</h3>
          <div className="space-y-2">
            {subList.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3">
                <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: a.accentColor }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.schedule} · {a.time} · {a.price}</p>
                </div>
                <button onClick={() => onCancelSub(a.id)} className="text-xs text-rose-500 font-medium px-2 py-1">Annuler</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessionList.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Séances réservées</h3>
          <div className="space-y-2">
            {sessionList.map(({ activity, slot }) => (
              <div key={`${activity.id}:${slot.id}`} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3">
                <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: activity.accentColor }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{activity.name}</p>
                  <p className="text-xs text-gray-400">{slot.label} · {slot.time}</p>
                </div>
                <button onClick={() => onCancelSession(activity.id, slot.id)} className="text-xs text-rose-500 font-medium px-2 py-1">Annuler</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
