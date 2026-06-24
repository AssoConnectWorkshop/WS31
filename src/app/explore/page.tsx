"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ACTIVITIES,
  INSTRUCTOR_TITLES,
  getUpcomingSessions,
  type Activity,
  type SessionSlot,
} from "@/data/activities";

type Tab = "explore" | "bookings" | "calendar";
type TypeFilter = "all" | "récurrent" | "ponctuel";

type ConfirmInfo = {
  activity: Activity;
  slot?: SessionSlot; // undefined = full-season subscription
};

const sessionKey = (aid: number, sid: number) => `${aid}:${sid}`;

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
const DAYS_SHORT = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("explore");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<Activity | null>(null);

  // Booking state (in-memory)
  const [bookedSessions, setBookedSessions] = useState<Set<string>>(new Set());
  const [subscriptions, setSubscriptions] = useState<Set<number>>(new Set());
  const [confirmInfo, setConfirmInfo] = useState<ConfirmInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Calendar navigation
  const [calMonth, setCalMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACTIVITIES.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.instructor.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, typeFilter]);

  const bookingCount = bookedSessions.size + subscriptions.size;

  const bookSession = (a: Activity, s: SessionSlot) => {
    const key = sessionKey(a.id, s.id);
    const alreadyBooked = bookedSessions.has(key);
    if (alreadyBooked) {
      setBookedSessions((prev) => { const n = new Set(prev); n.delete(key); return n; });
      showToast("Réservation annulée");
    } else {
      setBookedSessions((prev) => { const n = new Set(prev); n.add(key); return n; });
      setConfirmInfo({ activity: a, slot: s });
    }
  };

  const bookSubscription = (a: Activity) => {
    const alreadySubscribed = subscriptions.has(a.id);
    if (alreadySubscribed) {
      setSubscriptions((prev) => { const n = new Set(prev); n.delete(a.id); return n; });
      showToast("Inscription annulée");
    } else {
      setSubscriptions((prev) => { const n = new Set(prev); n.add(a.id); return n; });
      setConfirmInfo({ activity: a });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col relative">
        {/* App bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100 px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {tab === "explore" ? "Activités" : tab === "bookings" ? "Mes réservations" : "Calendrier"}
            </h1>
            <div className="flex items-center bg-gray-100 rounded-full p-0.5 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-white shadow-sm text-rose-500">🤸 Membre</span>
              <Link href="/activities" className="px-2.5 py-1 rounded-full text-gray-500">🛠 Admin</Link>
            </div>
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
                      typeFilter === val ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
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
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    onLearnMore={() => setSelected(a)}
                  />
                ))}
                {filtered.length === 0 && (
                  <div className="text-center text-gray-400 py-16 text-sm">
                    Aucune activité ne correspond à votre recherche.
                  </div>
                )}
              </div>
            </>
          ) : tab === "bookings" ? (
            <BookingsView
              bookedSessions={bookedSessions}
              subscriptions={subscriptions}
              onCancelSession={(aid, sid) => {
                setBookedSessions((prev) => { const n = new Set(prev); n.delete(sessionKey(aid, sid)); return n; });
              }}
              onCancelSub={(aid) => {
                setSubscriptions((prev) => { const n = new Set(prev); n.delete(aid); return n; });
              }}
              onExplore={() => setTab("explore")}
            />
          ) : (
            <CalendarView
              bookedSessions={bookedSessions}
              subscriptions={subscriptions}
              calMonth={calMonth}
              setCalMonth={setCalMonth}
              onSelectActivity={(a) => setSelected(a)}
            />
          )}
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur border-t border-gray-100 grid grid-cols-3 z-20">
          <NavBtn active={tab === "explore"} icon="🧭" label="Explorer" onClick={() => setTab("explore")} />
          <NavBtn active={tab === "calendar"} icon="📅" label="Calendrier" onClick={() => setTab("calendar")} />
          <NavBtn active={tab === "bookings"} icon="🎟️" label="Réservations" badge={bookingCount} onClick={() => setTab("bookings")} />
        </nav>

        {/* Detail sheet */}
        {selected && (
          <DetailSheet
            activity={selected}
            bookedSessions={bookedSessions}
            subscribed={subscriptions.has(selected.id)}
            onBookSession={(s) => bookSession(selected, s)}
            onBookSub={() => bookSubscription(selected)}
            onClose={() => setSelected(null)}
          />
        )}

        {/* Confirmation modal */}
        {confirmInfo && (
          <ConfirmModal
            info={confirmInfo}
            onClose={() => setConfirmInfo(null)}
            onGoHome={() => { setConfirmInfo(null); setSelected(null); setTab("explore"); }}
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
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

/* ── Nav button ── */
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

/* ── Activity card ── */
function ActivityCard({ activity: a, onLearnMore }: { activity: Activity; onLearnMore: () => void }) {
  const ratio = a.totalSpots ? a.registered / a.totalSpots : 0;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Image placeholder */}
      <div
        className="h-32 w-full relative flex items-end"
        style={{ background: `linear-gradient(135deg, ${a.accentColor}cc 0%, ${a.accentColor}44 100%)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-20 select-none">
          {a.type === "récurrent" ? "🔄" : "⚡"}
        </div>
        <div className="relative px-4 pb-3 pt-6 w-full bg-gradient-to-t from-black/30 to-transparent">
          <h3 className="font-bold text-white text-[16px] leading-tight drop-shadow">{a.name}</h3>
          <p className="text-white/80 text-xs mt-0.5">{a.schedule} · {a.time}</p>
        </div>
        {a.full && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase bg-black/50 text-white px-2 py-0.5 rounded-full">
            Complet
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>👤 {a.instructor}</span>
          <span>·</span>
          <span>📍 {a.location}</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: a.accentColor }}
            />
          </div>
          <span className="text-[11px] text-gray-400 whitespace-nowrap">{a.registered}/{a.totalSpots}</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {a.tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${a.accentColor}1a`, color: a.accentColor }}>
                {t}
              </span>
            ))}
          </div>
          <span className="text-sm font-bold" style={{ color: a.accentColor }}>{a.price}</span>
        </div>

        <button
          onClick={onLearnMore}
          className="mt-3 w-full py-2 rounded-xl border text-sm font-semibold transition-colors"
          style={{ borderColor: a.accentColor, color: a.accentColor }}
        >
          En savoir plus
        </button>
      </div>
    </div>
  );
}

/* ── Image carousel ── */
function ImageCarousel({ color }: { color: string }) {
  const [idx, setIdx] = useState(0);
  const slides = [
    { emoji: "🏃", label: "Séance en cours" },
    { emoji: "👥", label: "Groupe" },
    { emoji: "🏆", label: "Résultats" },
  ];
  return (
    <div className="relative h-48 overflow-hidden">
      <div
        className="flex h-full transition-transform duration-300"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div
            key={i}
            className="min-w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${color}bb 0%, ${color}33 100%)` }}
          >
            <span className="text-6xl opacity-60">{s.emoji}</span>
            <span className="text-white/70 text-xs font-medium">{s.label}</span>
          </div>
        ))}
      </div>
      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`} />
        ))}
      </div>
      {/* Arrows */}
      {idx > 0 && (
        <button onClick={() => setIdx((v) => v - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/25 text-white rounded-full flex items-center justify-center text-xs">
          ‹
        </button>
      )}
      {idx < slides.length - 1 && (
        <button onClick={() => setIdx((v) => v + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/25 text-white rounded-full flex items-center justify-center text-xs">
          ›
        </button>
      )}
    </div>
  );
}

/* ── Detail sheet ── */
function DetailSheet({ activity: a, bookedSessions, subscribed, onBookSession, onBookSub, onClose }: {
  activity: Activity;
  bookedSessions: Set<string>;
  subscribed: boolean;
  onBookSession: (s: SessionSlot) => void;
  onBookSub: () => void;
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
        {/* Image carousel */}
        <div className="shrink-0 relative">
          <ImageCarousel color={a.accentColor} />
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white text-lg z-10">
            ✕
          </button>
          <div className="absolute bottom-0 inset-x-0 px-5 pb-4 pt-8 bg-gradient-to-t from-black/60 to-transparent">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/80">
              {isRecurring ? "Cours régulier" : "À la séance"}
            </div>
            <h2 className="text-2xl font-extrabold text-white mt-0.5 pr-10">{a.name}</h2>
            <p className="text-white/80 text-sm mt-0.5">{a.schedule} · {a.time}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {a.tags.map((t) => (
                <span key={t} className="text-[11px] font-medium bg-white/20 px-2 py-0.5 rounded-full text-white">{t}</span>
              ))}
            </div>
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
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                style={{ backgroundColor: a.accentColor }}>
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
            {isRecurring ? (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold">{s.label}</p>
                      <p className="text-xs text-gray-400">{s.time} · {s.spotsLeft <= 0 ? "Complet" : `${s.spotsLeft} place${s.spotsLeft > 1 ? "s" : ""}`}</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Inscris-toi au cours pour accéder à toutes les séances
                </p>
              </div>
            ) : (
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
                        onClick={() => !full && onBookSession(s)}
                        disabled={full}
                        className={`shrink-0 text-xs font-bold px-3.5 py-2 rounded-lg transition-colors ${
                          booked ? "bg-emerald-100 text-emerald-700"
                          : full ? "bg-gray-100 text-gray-400 cursor-not-allowed"
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
            )}
          </div>
        </div>

        {/* Sticky CTA (recurring courses only) */}
        {isRecurring && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-3 bg-white">
            <button
              onClick={onBookSub}
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

/* ── Confirmation modal ── */
function ConfirmModal({ info, onClose, onGoHome }: {
  info: ConfirmInfo;
  onClose: () => void;
  onGoHome: () => void;
}) {
  const { activity: a, slot } = info;
  const isSubscription = !slot;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ animation: "fadeIn 0.15s ease" }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl px-6 pt-6 pb-8"
        style={{ animation: "scaleIn 0.2s ease" }}
      >
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg">
          ✕
        </button>

        {/* Success icon */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3"
            style={{ backgroundColor: `${a.accentColor}22`, color: a.accentColor }}>
            ✓
          </div>
          <h2 className="text-xl font-extrabold">
            {isSubscription ? "Inscription confirmée !" : "Réservation confirmée !"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isSubscription ? "Tu es inscrit·e à toutes les séances du cours." : "Ta séance est bien réservée."}
          </p>
        </div>

        {/* Recap */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0 text-lg"
              style={{ backgroundColor: a.accentColor }}>
              {a.name[0]}
            </div>
            <div>
              <p className="font-bold">{a.name}</p>
              <p className="text-xs text-gray-400">{a.schedule} · {a.time}</p>
            </div>
          </div>
          {slot && (
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2.5">
              <span className="text-gray-500">Séance</span>
              <span className="font-semibold">{slot.label}</span>
            </div>
          )}
          {isSubscription && (
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2.5">
              <span className="text-gray-500">Saison complète</span>
              <span className="font-semibold">{a.sessions ? `${a.sessions} séances` : "En continu"}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2.5">
            <span className="text-gray-500">Tarif</span>
            <span className="font-semibold" style={{ color: a.accentColor }}>{a.price}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2.5">
            <span className="text-gray-500">Lieu</span>
            <span className="font-semibold">{a.location}</span>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onGoHome}
          className="mt-4 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-colors"
          style={{ backgroundColor: a.accentColor }}
        >
          Retour à l&apos;accueil
        </button>
        <button onClick={onClose} className="mt-2.5 w-full py-2.5 rounded-xl text-sm font-medium text-gray-500">
          Voir les détails de l&apos;activité
        </button>
      </div>
    </div>
  );
}

/* ── Fact chip ── */
function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2">
      <p className="text-[11px] text-gray-400">{icon} {label}</p>
      <p className="text-sm font-semibold mt-0.5 leading-tight">{value}</p>
    </div>
  );
}

/* ── Calendar view ── */
function CalendarView({ bookedSessions, subscriptions, calMonth, setCalMonth, onSelectActivity }: {
  bookedSessions: Set<string>;
  subscriptions: Set<number>;
  calMonth: Date;
  setCalMonth: (d: Date) => void;
  onSelectActivity: (a: Activity) => void;
}) {
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();

  const navigate = (dir: number) => {
    setCalMonth(new Date(year, month + dir, 1));
  };

  // Build day -> activities map using upcoming sessions
  const dayMap = useMemo(() => {
    const map: Record<number, Activity[]> = {};
    for (const a of ACTIVITIES) {
      const sessions = getUpcomingSessions(a);
      for (const s of sessions) {
        // parse session label like "Lun. 30 juin" or "Mar. 1 juil."
        const label = s.label.toLowerCase();
        const MONTH_ABBR: Record<string, number> = {
          janv: 0, févr: 1, mars: 2, avr: 3, mai: 4, juin: 5,
          juil: 6, août: 7, sept: 8, oct: 9, nov: 10, déc: 11,
        };
        const parts = label.replace(/\./g, "").split(" ").filter(Boolean);
        // parts: ["lun", "30", "juin"] or similar
        let day = -1, sessionMonth = -1;
        for (let i = 0; i < parts.length; i++) {
          const n = parseInt(parts[i]);
          if (!isNaN(n) && day === -1) { day = n; continue; }
          for (const [abbr, mIdx] of Object.entries(MONTH_ABBR)) {
            if (parts[i].startsWith(abbr)) { sessionMonth = mIdx; break; }
          }
        }
        if (day > 0 && sessionMonth === month) {
          (map[day] ||= []).push(a);
        }
      }
    }
    return map;
  }, [month]);

  // Calendar grid
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">‹</button>
        <span className="font-bold text-base">{MONTHS_FR[month]} {year}</span>
        <button onClick={() => navigate(1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d, i) => {
          const activities = d ? (dayMap[d] || []) : [];
          const hasBooking = d ? activities.some((a) => {
            if (subscriptions.has(a.id)) return true;
            const sessions = getUpcomingSessions(a);
            return sessions.some((s) => bookedSessions.has(sessionKey(a.id, s.id)));
          }) : false;
          return (
            <div key={i} className="flex flex-col items-center py-1">
              {d ? (
                <>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-0.5 ${
                    isToday(d) ? "bg-indigo-600 text-white" : hasBooking ? "bg-indigo-100 text-indigo-700" : "text-gray-700"
                  }`}>
                    {d}
                  </div>
                  <div className="flex gap-0.5 flex-wrap justify-center max-w-[36px]">
                    {activities.slice(0, 3).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => onSelectActivity(a)}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: a.accentColor }}
                        title={a.name}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5">
        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Ce mois-ci</p>
        {Object.entries(dayMap).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Aucune séance ce mois-ci</p>
        ) : (
          <div className="space-y-1.5">
            {Object.entries(dayMap)
              .sort(([a], [b]) => Number(a) - Number(b))
              .slice(0, 8)
              .map(([day, acts]) => (
                <div key={day} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2">
                  <div className="w-9 text-center">
                    <span className="text-lg font-extrabold text-gray-700">{day}</span>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {acts.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => onSelectActivity(a)}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${a.accentColor}22`, color: a.accentColor }}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Bookings view ── */
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
