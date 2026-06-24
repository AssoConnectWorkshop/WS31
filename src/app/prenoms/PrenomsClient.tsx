"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { likeName, unlikeName } from "./actions";
import type { BabyName, Like } from "./page";

type GenderFilter = "all" | "M" | "F" | "MF";
type StyleFilter = "all" | "classique" | "moderne" | "original";
type Tab = "discover" | "wishlist" | "matches";
type Partner = "partner_a" | "partner_b";

const PARTNER_COLORS: Record<Partner, string> = {
  partner_a: "bg-violet-600",
  partner_b: "bg-rose-500",
};

const GENDER_LABELS: Record<GenderFilter, string> = {
  all: "Tous", M: "Garçon", F: "Fille", MF: "Mixte",
};

const STYLE_LABELS: Record<StyleFilter, string> = {
  all: "Tous", classique: "Classique", moderne: "Moderne", original: "Original",
};

const GENDER_COLORS: Record<string, string> = {
  M: "bg-blue-100 text-blue-700",
  F: "bg-pink-100 text-pink-700",
  MF: "bg-purple-100 text-purple-700",
};

const GENDER_EMOJI: Record<string, string> = { M: "👦", F: "👧", MF: "🧒" };

const STYLE_COLORS: Record<string, string> = {
  classique: "bg-amber-100 text-amber-700",
  moderne: "bg-emerald-100 text-emerald-700",
  original: "bg-violet-100 text-violet-700",
};

const SWIPE_THRESHOLD = 80;

export default function PrenomsClient({
  names,
  initialLikes,
}: {
  names: BabyName[];
  initialLikes: Like[];
}) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [likes, setLikes] = useState<Like[]>(initialLikes);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");
  const [tab, setTab] = useState<Tab>("discover");
  const [newMatch, setNewMatch] = useState<BabyName | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Swipe state
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("prenoms_partner") as Partner | null;
    if (stored === "partner_a" || stored === "partner_b") setPartner(stored);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("baby_name_likes")
      .on("postgres_changes", { event: "*", schema: "public", table: "baby_name_likes" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newLike = payload.new as Like;
          setLikes((prev) =>
            prev.some((l) => l.partner_id === newLike.partner_id && l.name_id === newLike.name_id)
              ? prev
              : [...prev, newLike]
          );
        } else if (payload.eventType === "DELETE") {
          const old = payload.old as Like;
          setLikes((prev) => prev.filter((l) => !(l.partner_id === old.partner_id && l.name_id === old.name_id)));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const matchIds = useMemo(() => {
    const a = new Set(likes.filter((l) => l.partner_id === "partner_a").map((l) => l.name_id));
    const b = new Set(likes.filter((l) => l.partner_id === "partner_b").map((l) => l.name_id));
    return new Set([...a].filter((id) => b.has(id)));
  }, [likes]);

  const prevMatchIdsRef = useRef(new Set<number>());
  useEffect(() => {
    if (!partner) return;
    for (const id of matchIds) {
      if (!prevMatchIdsRef.current.has(id)) {
        const matched = names.find((n) => n.id === id);
        if (matched) setNewMatch(matched);
      }
    }
    prevMatchIdsRef.current = new Set(matchIds);
  }, [matchIds, names, partner]);

  const myLikedIds = useMemo(
    () => new Set(likes.filter((l) => l.partner_id === partner).map((l) => l.name_id)),
    [likes, partner]
  );

  const filtered = useMemo(() => names.filter((n) => {
    const g = genderFilter === "all" || n.gender === genderFilter || (genderFilter !== "MF" && n.gender === "MF");
    const s = styleFilter === "all" || n.style === styleFilter;
    return g && s;
  }), [names, genderFilter, styleFilter]);

  const queue = useMemo(
    () => filtered.filter((n) => !myLikedIds.has(n.id) && !skipped.includes(n.id)),
    [filtered, myLikedIds, skipped]
  );

  const current = queue[0];
  const myWishlist = useMemo(() => names.filter((n) => myLikedIds.has(n.id)), [names, myLikedIds]);
  const matches = useMemo(() => names.filter((n) => matchIds.has(n.id)), [names, matchIds]);

  const handleLike = useCallback(() => {
    if (!current || !partner) return;
    setLikes((prev) => [...prev, { partner_id: partner, name_id: current.id }]);
    setDragX(0);
    likeName(partner, current.id);
  }, [current, partner]);

  const handleSkip = useCallback(() => {
    if (!current) return;
    setSkipped((s) => [...s, current.id]);
    setDragX(0);
  }, [current]);

  const handleUnlike = useCallback((nameId: number) => {
    if (!partner) return;
    setLikes((prev) => prev.filter((l) => !(l.partner_id === partner && l.name_id === nameId)));
    unlikeName(partner, nameId);
  }, [partner]);

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    setDragX(dx);
  }, []);

  const onTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragX > SWIPE_THRESHOLD) handleLike();
    else if (dragX < -SWIPE_THRESHOLD) handleSkip();
    else setDragX(0);
  }, [dragX, handleLike, handleSkip]);

  const swipeProgress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
  const isLiking = dragX > 20;
  const isSkipping = dragX < -20;

  if (!partner) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50 flex flex-col items-center justify-center gap-8 p-6 safe-area-pb">
        <div className="text-center">
          <div className="text-7xl mb-4">👶</div>
          <h1 className="text-3xl font-bold text-gray-900">Trouve un prénom</h1>
          <p className="text-gray-500 mt-2 text-lg">Qui êtes-vous ?</p>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => { localStorage.setItem("prenoms_partner", "partner_a"); setPartner("partner_a"); }}
            className="w-full py-5 bg-violet-600 text-white rounded-2xl text-lg font-bold shadow-lg active:scale-95 transition-transform"
          >
            💜 Partenaire A
          </button>
          <button
            onClick={() => { localStorage.setItem("prenoms_partner", "partner_b"); setPartner("partner_b"); }}
            className="w-full py-5 bg-rose-500 text-white rounded-2xl text-lg font-bold shadow-lg active:scale-95 transition-transform"
          >
            ❤️ Partenaire B
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center max-w-xs leading-relaxed">
          Chaque partenaire ouvre l&apos;app sur son téléphone. Un match apparaît quand vous aimez tous les deux le même prénom.
        </p>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-violet-50 overflow-hidden">
      {/* Match notification */}
      {newMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-4 text-center w-full max-w-sm">
            <div className="text-7xl">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900">C&apos;est un match !</h2>
            <p className="text-6xl font-bold text-violet-600 py-2">{newMatch.name}</p>
            <p className="text-gray-400 text-sm italic">&ldquo;{newMatch.meaning}&rdquo;</p>
            <button
              onClick={() => setNewMatch(null)}
              className="mt-2 w-full py-4 bg-violet-600 text-white rounded-2xl text-lg font-bold active:scale-95 transition-transform"
            >
              Super ! 🥳
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-safe-top py-3 bg-white/90 backdrop-blur-sm border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${PARTNER_COLORS[partner]}`} />
          <span className="text-sm font-semibold text-gray-700">
            {partner === "partner_a" ? "Partenaire A" : "Partenaire B"}
          </span>
        </div>
        <h1 className="text-base font-bold text-gray-900">👶 Prénoms</h1>
        <button
          onClick={() => { localStorage.removeItem("prenoms_partner"); setPartner(null); }}
          className="text-xs text-gray-400 px-2 py-1 rounded-lg active:bg-gray-100"
        >
          Changer
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === "discover" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter bar */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {(["all", "M", "F", "MF"] as GenderFilter[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => { setGenderFilter(g); setSkipped([]); }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${
                        genderFilter === g ? "border-violet-500 bg-violet-600 text-white" : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      {g !== "all" && GENDER_EMOJI[g] + " "}{GENDER_LABELS[g]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`ml-2 shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    styleFilter !== "all" ? "border-violet-500 bg-violet-600 text-white" : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  Style {styleFilter !== "all" ? "·" : "▾"}
                </button>
              </div>
              {showFilters && (
                <div className="flex gap-1.5 pb-1 overflow-x-auto no-scrollbar">
                  {(["all", "classique", "moderne", "original"] as StyleFilter[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStyleFilter(s); setSkipped([]); setShowFilters(false); }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${
                        styleFilter === s ? "border-violet-500 bg-violet-600 text-white" : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      {STYLE_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
              {/* Progress bar */}
              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-violet-400 rounded-full transition-all duration-500"
                  style={{ width: filtered.length ? `${((filtered.length - queue.length) / filtered.length) * 100}%` : "0%" }}
                />
              </div>
            </div>

            {/* Card area */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 gap-4 overflow-hidden">
              {current ? (
                <>
                  {/* Swipeable card */}
                  <div className="relative w-full max-w-sm select-none" style={{ touchAction: "pan-y" }}>
                    {/* Like indicator */}
                    {isLiking && (
                      <div className="absolute top-6 right-6 z-10 rotate-12 border-4 border-emerald-400 rounded-xl px-3 py-1" style={{ opacity: swipeProgress }}>
                        <span className="text-emerald-500 font-black text-2xl">J&apos;aime ❤️</span>
                      </div>
                    )}
                    {/* Skip indicator */}
                    {isSkipping && (
                      <div className="absolute top-6 left-6 z-10 -rotate-12 border-4 border-rose-400 rounded-xl px-3 py-1" style={{ opacity: swipeProgress }}>
                        <span className="text-rose-500 font-black text-2xl">Nope 👎</span>
                      </div>
                    )}

                    <div
                      ref={cardRef}
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                      className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-5 cursor-grab active:cursor-grabbing"
                      style={{
                        transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
                        transition: isDragging ? "none" : "transform 0.3s ease",
                      }}
                    >
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${GENDER_COLORS[current.gender]}`}>
                        {GENDER_EMOJI[current.gender]} {GENDER_LABELS[current.gender as GenderFilter]}
                      </span>
                      <h2 className="text-6xl font-black text-gray-900 tracking-tight text-center">
                        {current.name}
                      </h2>
                      <div className="text-center">
                        <p className="text-gray-400 text-sm font-medium">{current.origin}</p>
                        <p className="text-gray-600 mt-1 italic text-sm">&ldquo;{current.meaning}&rdquo;</p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STYLE_COLORS[current.style]}`}>
                        {current.style}
                      </span>
                      <p className="text-xs text-gray-300 mt-1">Glissez ou utilisez les boutons</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-6 items-center">
                    <button
                      onClick={handleSkip}
                      className="w-16 h-16 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-3xl active:scale-90 transition-transform"
                    >
                      👎
                    </button>
                    <button
                      onClick={handleLike}
                      className="w-20 h-20 rounded-full bg-rose-500 shadow-xl flex items-center justify-center text-4xl active:scale-90 transition-transform"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={handleSkip}
                      className="w-16 h-16 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-3xl active:scale-90 transition-transform"
                    >
                      ⏭
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    {queue.length - 1} restant{queue.length - 1 !== 1 ? "s" : ""}
                  </p>
                </>
              ) : (
                <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-10 flex flex-col items-center gap-4 text-center">
                  <span className="text-6xl">🎉</span>
                  <h2 className="text-xl font-bold text-gray-800">Tout vu !</h2>
                  <p className="text-gray-500 text-sm">
                    {myWishlist.length} prénom{myWishlist.length !== 1 ? "s" : ""} dans votre liste.
                  </p>
                  <button
                    onClick={() => setSkipped([])}
                    className="w-full py-4 bg-violet-600 text-white rounded-2xl font-bold active:scale-95 transition-transform"
                  >
                    Recommencer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "wishlist" && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="text-sm font-semibold text-gray-500 mb-3">
              {myWishlist.length === 0 ? "Votre liste est vide" : `${myWishlist.length} prénom${myWishlist.length !== 1 ? "s" : ""}`}
            </p>
            {myWishlist.length === 0 ? (
              <div className="flex flex-col items-center gap-4 pt-16 text-center">
                <span className="text-6xl">💝</span>
                <p className="text-gray-400 text-sm">Likez des prénoms pour les retrouver ici.</p>
                <button onClick={() => setTab("discover")} className="px-6 py-3 bg-violet-600 text-white rounded-2xl font-semibold">
                  Découvrir
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myWishlist.map((n) => (
                  <div key={n.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-gray-900">{n.name}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${GENDER_COLORS[n.gender]}`}>{GENDER_EMOJI[n.gender]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STYLE_COLORS[n.style]}`}>{n.style}</span>
                        {matchIds.has(n.id) && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600 font-bold">✨ Match</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{n.origin} · {n.meaning}</p>
                    </div>
                    <button onClick={() => handleUnlike(n.id)} className="text-gray-300 active:text-rose-400 p-2 -mr-1 text-lg">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "matches" && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="text-sm font-semibold text-gray-500 mb-3">
              {matches.length === 0 ? "Aucun match pour l'instant" : `${matches.length} match${matches.length > 1 ? "es" : ""} ✨`}
            </p>
            {matches.length === 0 ? (
              <div className="flex flex-col items-center gap-4 pt-16 text-center">
                <span className="text-6xl">💫</span>
                <p className="text-gray-400 text-sm max-w-xs">Likez les mêmes prénoms que votre partenaire pour créer un match.</p>
                <button onClick={() => setTab("discover")} className="px-6 py-3 bg-violet-600 text-white rounded-2xl font-semibold">
                  Découvrir
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {matches.map((n) => (
                  <div key={n.id} className="bg-gradient-to-r from-violet-50 to-rose-50 rounded-2xl border border-violet-100 px-5 py-4 flex items-center gap-3">
                    <span className="text-3xl shrink-0">✨</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xl font-black text-gray-900">{n.name}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${GENDER_COLORS[n.gender]}`}>{GENDER_EMOJI[n.gender]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STYLE_COLORS[n.style]}`}>{n.style}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{n.origin} · {n.meaning}</p>
                      <p className="text-xs text-violet-500 font-medium mt-1">💜 A &amp; ❤️ B ont tous les deux liké</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="shrink-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 pb-safe-bottom">
        <div className="flex">
          {([
            { id: "discover", icon: "🔍", label: "Découvrir" },
            { id: "wishlist", icon: "❤️", label: `Liste (${myWishlist.length})` },
            { id: "matches", icon: "✨", label: `Matches (${matches.length})` },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                tab === item.id ? "text-violet-600" : "text-gray-400"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
