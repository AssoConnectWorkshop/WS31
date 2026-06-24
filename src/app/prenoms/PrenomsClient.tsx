"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { likeName, unlikeName } from "./actions";
import type { BabyName, Like } from "./page";

type GenderFilter = "all" | "M" | "F" | "MF";
type StyleFilter = "all" | "classique" | "moderne" | "original";
type Tab = "discover" | "wishlist" | "matches";
type Partner = "partner_a" | "partner_b";

const PARTNER_LABELS: Record<Partner, string> = {
  partner_a: "Partenaire A",
  partner_b: "Partenaire B",
};

const PARTNER_COLORS: Record<Partner, string> = {
  partner_a: "bg-violet-600",
  partner_b: "bg-rose-500",
};

const GENDER_LABELS: Record<GenderFilter, string> = {
  all: "Tous",
  M: "Garçon",
  F: "Fille",
  MF: "Mixte",
};

const STYLE_LABELS: Record<StyleFilter, string> = {
  all: "Tous styles",
  classique: "Classique",
  moderne: "Moderne",
  original: "Original",
};

const GENDER_COLORS: Record<string, string> = {
  M: "bg-blue-100 text-blue-700",
  F: "bg-pink-100 text-pink-700",
  MF: "bg-purple-100 text-purple-700",
};

const GENDER_EMOJI: Record<string, string> = {
  M: "👦",
  F: "👧",
  MF: "🧒",
};

function StyleBadge({ style }: { style: string }) {
  const cls =
    style === "classique"
      ? "bg-amber-100 text-amber-700"
      : style === "moderne"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-violet-100 text-violet-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {style}
    </span>
  );
}

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
  const [animating, setAnimating] = useState<"like" | "skip" | null>(null);
  const [newMatch, setNewMatch] = useState<BabyName | null>(null);

  // Load partner from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("prenoms_partner") as Partner | null;
    if (stored === "partner_a" || stored === "partner_b") {
      setPartner(stored);
    }
  }, []);

  // Supabase realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("baby_name_likes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "baby_name_likes" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newLike = payload.new as Like;
            setLikes((prev) => {
              if (prev.some((l) => l.partner_id === newLike.partner_id && l.name_id === newLike.name_id)) {
                return prev;
              }
              return [...prev, newLike];
            });
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as Like;
            setLikes((prev) =>
              prev.filter(
                (l) => !(l.partner_id === old.partner_id && l.name_id === old.name_id)
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Detect new matches
  const matchIds = useMemo(() => {
    const aLikes = new Set(likes.filter((l) => l.partner_id === "partner_a").map((l) => l.name_id));
    const bLikes = new Set(likes.filter((l) => l.partner_id === "partner_b").map((l) => l.name_id));
    return new Set([...aLikes].filter((id) => bLikes.has(id)));
  }, [likes]);

  const prevMatchIdsRef = useState(() => new Set<number>())[0];
  useEffect(() => {
    if (!partner) return;
    for (const id of matchIds) {
      if (!prevMatchIdsRef.has(id)) {
        const matched = names.find((n) => n.id === id);
        if (matched) setNewMatch(matched);
      }
    }
    prevMatchIdsRef.clear();
    matchIds.forEach((id) => prevMatchIdsRef.add(id));
  }, [matchIds, names, partner, prevMatchIdsRef]);

  const myLikedIds = useMemo(
    () => new Set(likes.filter((l) => l.partner_id === partner).map((l) => l.name_id)),
    [likes, partner]
  );

  const filtered = useMemo(() => {
    return names.filter((n) => {
      const genderMatch =
        genderFilter === "all" ||
        n.gender === genderFilter ||
        (genderFilter !== "MF" && n.gender === "MF");
      const styleMatch = styleFilter === "all" || n.style === styleFilter;
      return genderMatch && styleMatch;
    });
  }, [names, genderFilter, styleFilter]);

  const queue = useMemo(
    () => filtered.filter((n) => !myLikedIds.has(n.id) && !skipped.includes(n.id)),
    [filtered, myLikedIds, skipped]
  );

  const current = queue[0];

  const myWishlist = useMemo(
    () => names.filter((n) => myLikedIds.has(n.id)),
    [names, myLikedIds]
  );

  const matches = useMemo(
    () => names.filter((n) => matchIds.has(n.id)),
    [names, matchIds]
  );

  const handleChoosePartner = useCallback((p: Partner) => {
    localStorage.setItem("prenoms_partner", p);
    setPartner(p);
  }, []);

  const handleLike = useCallback(async () => {
    if (!current || !partner) return;
    setAnimating("like");
    await likeName(partner, current.id);
    setTimeout(() => setAnimating(null), 300);
  }, [current, partner]);

  const handleSkip = useCallback(() => {
    if (!current) return;
    setAnimating("skip");
    setTimeout(() => {
      setSkipped((s) => [...s, current.id]);
      setAnimating(null);
    }, 300);
  }, [current]);

  const handleUnlike = useCallback(async (nameId: number) => {
    if (!partner) return;
    await unlikeName(partner, nameId);
  }, [partner]);

  // Partner selection screen
  if (!partner) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">👶</div>
          <h1 className="text-3xl font-bold text-gray-900">Trouve un prénom</h1>
          <p className="text-gray-500 mt-2">Qui êtes-vous ?</p>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => handleChoosePartner("partner_a")}
            className="w-full py-4 bg-violet-600 text-white rounded-2xl text-lg font-semibold shadow-lg hover:bg-violet-700 transition-colors"
          >
            💜 Partenaire A
          </button>
          <button
            onClick={() => handleChoosePartner("partner_b")}
            className="w-full py-4 bg-rose-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:bg-rose-600 transition-colors"
          >
            ❤️ Partenaire B
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Chaque partenaire ouvre l&apos;app sur son téléphone et choisit son rôle. Un match apparaît quand vous aimez tous les deux le même prénom.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50 flex flex-col">
      {/* Match notification */}
      {newMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-4 text-center max-w-sm mx-4 animate-bounce-once">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900">C&apos;est un match !</h2>
            <p className="text-5xl font-bold text-violet-600">{newMatch.name}</p>
            <p className="text-gray-500 text-sm italic">{newMatch.meaning}</p>
            <button
              onClick={() => setNewMatch(null)}
              className="mt-2 px-6 py-2.5 bg-violet-600 text-white rounded-full font-semibold hover:bg-violet-700 transition-colors"
            >
              Super ! 🥳
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${PARTNER_COLORS[partner]}`} />
          <span className="text-sm font-medium text-gray-700">{PARTNER_LABELS[partner]}</span>
        </div>
        <h1 className="text-base font-bold text-gray-900">👶 Trouve un prénom</h1>
        <button
          onClick={() => {
            localStorage.removeItem("prenoms_partner");
            setPartner(null);
          }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Changer
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-[53px] z-10">
        {(["discover", "wishlist", "matches"] as Tab[]).map((t) => {
          const label =
            t === "discover" ? "Découvrir" : t === "wishlist" ? `Ma liste (${myWishlist.length})` : `Matches ✨ ${matches.length}`;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-violet-600 text-violet-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "discover" && (
        <div className="flex flex-col flex-1 items-center px-4 py-5 gap-5 max-w-lg mx-auto w-full">
          {/* Filters */}
          <div className="w-full flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              {(["all", "M", "F", "MF"] as GenderFilter[]).map((g) => (
                <button
                  key={g}
                  onClick={() => { setGenderFilter(g); setSkipped([]); }}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                    genderFilter === g
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  {g !== "all" && GENDER_EMOJI[g] + " "}{GENDER_LABELS[g]}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all", "classique", "moderne", "original"] as StyleFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStyleFilter(s); setSkipped([]); }}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                    styleFilter === s
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="w-full">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{filtered.length - queue.length} vus</span>
              <span>{queue.length} restants</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-400 rounded-full transition-all duration-500"
                style={{
                  width: filtered.length
                    ? `${((filtered.length - queue.length) / filtered.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>

          {current ? (
            <div className="w-full flex flex-col items-center gap-4">
              <div
                className={`w-full bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-4 transition-all duration-300 ${
                  animating === "like"
                    ? "translate-x-12 opacity-0 rotate-3"
                    : animating === "skip"
                    ? "-translate-x-12 opacity-0 -rotate-3"
                    : "translate-x-0 opacity-100"
                }`}
              >
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${GENDER_COLORS[current.gender]}`}>
                  {GENDER_EMOJI[current.gender]} {GENDER_LABELS[current.gender as GenderFilter]}
                </span>
                <h2 className="text-6xl font-bold text-gray-900 tracking-tight">{current.name}</h2>
                <div className="text-center">
                  <p className="text-gray-500 text-sm font-medium">{current.origin}</p>
                  <p className="text-gray-700 mt-1 italic">&ldquo;{current.meaning}&rdquo;</p>
                </div>
                <StyleBadge style={current.style} />
              </div>

              <div className="flex gap-4 items-center">
                <button
                  onClick={handleSkip}
                  className="w-14 h-14 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-transform"
                >
                  👎
                </button>
                <button
                  onClick={handleLike}
                  className="w-16 h-16 rounded-full bg-rose-500 shadow-lg flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-transform"
                >
                  ❤️
                </button>
                <button
                  onClick={handleSkip}
                  className="w-14 h-14 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-transform"
                >
                  ⏭
                </button>
              </div>

              <p className="text-xs text-gray-400">
                {queue.length - 1} prénom{queue.length - 1 !== 1 ? "s" : ""} restant{queue.length - 1 !== 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <div className="w-full bg-white rounded-3xl shadow-xl p-10 flex flex-col items-center gap-4 text-center">
              <span className="text-5xl">🎉</span>
              <h2 className="text-xl font-bold text-gray-800">Vous avez tout vu !</h2>
              <p className="text-gray-500 text-sm">
                {myWishlist.length > 0
                  ? `${myWishlist.length} prénom${myWishlist.length > 1 ? "s" : ""} dans votre liste.`
                  : "Aucun prénom dans votre liste."}
              </p>
              <button
                onClick={() => setSkipped([])}
                className="px-5 py-2 bg-violet-600 text-white rounded-full text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                Recommencer
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "wishlist" && (
        <div className="flex flex-col flex-1 px-4 py-5 gap-4 max-w-lg mx-auto w-full">
          <h2 className="text-base font-semibold text-gray-800">
            {myWishlist.length === 0 ? "Votre liste est vide" : `${myWishlist.length} prénom${myWishlist.length > 1 ? "s" : ""} dans votre liste`}
          </h2>

          {myWishlist.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-5xl">💝</span>
              <p className="text-gray-500 text-sm">Likez des prénoms dans &laquo;Découvrir&raquo; pour les voir ici.</p>
              <button
                onClick={() => setTab("discover")}
                className="px-5 py-2 bg-violet-600 text-white rounded-full text-sm font-medium"
              >
                Découvrir
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myWishlist.map((n) => (
                <div key={n.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl font-bold text-gray-900">{n.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${GENDER_COLORS[n.gender]}`}>
                        {GENDER_EMOJI[n.gender]}
                      </span>
                      <StyleBadge style={n.style} />
                      {matchIds.has(n.id) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
                          ✨ Match !
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {n.origin} · <span className="italic">{n.meaning}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnlike(n.id)}
                    className="text-gray-300 hover:text-rose-400 transition-colors text-lg"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "matches" && (
        <div className="flex flex-col flex-1 px-4 py-5 gap-4 max-w-lg mx-auto w-full">
          <h2 className="text-base font-semibold text-gray-800">
            {matches.length === 0 ? "Aucun match pour l’instant" : `${matches.length} match${matches.length > 1 ? "es" : ""} ✨`}
          </h2>

          {matches.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-5xl">💫</span>
              <p className="text-gray-500 text-sm max-w-xs">
                Un match apparaît quand vous et votre partenaire likez le même prénom.
              </p>
              <button
                onClick={() => setTab("discover")}
                className="px-5 py-2 bg-violet-600 text-white rounded-full text-sm font-medium"
              >
                Découvrir des prénoms
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {matches.map((n) => (
                <div key={n.id} className="bg-gradient-to-r from-violet-50 to-rose-50 rounded-2xl border border-violet-100 p-5 flex items-center gap-4">
                  <div className="text-3xl">✨</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl font-bold text-gray-900">{n.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${GENDER_COLORS[n.gender]}`}>
                        {GENDER_EMOJI[n.gender]}
                      </span>
                      <StyleBadge style={n.style} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {n.origin} · <span className="italic">{n.meaning}</span>
                    </p>
                    <p className="text-xs text-violet-500 font-medium mt-1">
                      💜 Partenaire A &amp; ❤️ Partenaire B
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
