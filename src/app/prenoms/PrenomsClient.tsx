"use client";

import { useState, useMemo } from "react";
import type { BabyName } from "./page";

type GenderFilter = "all" | "M" | "F" | "MF";
type StyleFilter = "all" | "classique" | "moderne" | "original";
type Mode = "discover" | "favorites";

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

export default function PrenomsClient({ names }: { names: BabyName[] }) {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [mode, setMode] = useState<Mode>("discover");
  const [animating, setAnimating] = useState<"like" | "skip" | null>(null);

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
    () => filtered.filter((n) => !favorites.includes(n.id) && !skipped.includes(n.id)),
    [filtered, favorites, skipped]
  );

  const current = queue[0];
  const favoriteNames = names.filter((n) => favorites.includes(n.id));

  function handleLike() {
    if (!current) return;
    setAnimating("like");
    setTimeout(() => {
      setFavorites((f) => [...f, current.id]);
      setAnimating(null);
    }, 300);
  }

  function handleSkip() {
    if (!current) return;
    setAnimating("skip");
    setTimeout(() => {
      setSkipped((s) => [...s, current.id]);
      setAnimating(null);
    }, 300);
  }

  function handleRemoveFavorite(id: number) {
    setFavorites((f) => f.filter((fid) => fid !== id));
  }

  function handleReset() {
    setSkipped([]);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trouve un prénom 👶</h1>
          <p className="text-xs text-gray-400">{names.length} prénoms disponibles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("discover")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              mode === "discover"
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Découvrir
          </button>
          <button
            onClick={() => setMode("favorites")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              mode === "favorites"
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ❤️ {favorites.length}
          </button>
        </div>
      </header>

      {mode === "discover" ? (
        <div className="flex flex-col flex-1 items-center px-4 py-6 gap-6 max-w-lg mx-auto w-full">
          {/* Filters */}
          <div className="w-full flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              {(["all", "M", "F", "MF"] as GenderFilter[]).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setGenderFilter(g);
                    setSkipped([]);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    genderFilter === g
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {g !== "all" && GENDER_EMOJI[g] + " "}
                  {GENDER_LABELS[g]}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all", "classique", "moderne", "original"] as StyleFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStyleFilter(s);
                    setSkipped([]);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    styleFilter === s
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
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

          {/* Card */}
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
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${GENDER_COLORS[current.gender]}`}
                >
                  {GENDER_EMOJI[current.gender]} {GENDER_LABELS[current.gender as GenderFilter]}
                </span>

                <h2 className="text-6xl font-bold text-gray-900 tracking-tight">
                  {current.name}
                </h2>

                <div className="text-center">
                  <p className="text-gray-500 text-sm font-medium">{current.origin}</p>
                  <p className="text-gray-700 mt-1 italic">"{current.meaning}"</p>
                </div>

                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    current.style === "classique"
                      ? "bg-amber-100 text-amber-700"
                      : current.style === "moderne"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-violet-100 text-violet-700"
                  }`}
                >
                  {current.style}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 items-center">
                <button
                  onClick={handleSkip}
                  className="w-14 h-14 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-transform"
                  title="Passer"
                >
                  👎
                </button>
                <button
                  onClick={handleLike}
                  className="w-16 h-16 rounded-full bg-rose-500 shadow-lg flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-transform"
                  title="J'aime"
                >
                  ❤️
                </button>
                <button
                  onClick={handleSkip}
                  className="w-14 h-14 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-transform"
                  title="Suivant"
                >
                  ⏭
                </button>
              </div>

              <p className="text-xs text-gray-400">
                {queue.length - 1} prénom{queue.length - 1 > 1 ? "s" : ""} restant{queue.length - 1 > 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <div className="w-full bg-white rounded-3xl shadow-xl p-10 flex flex-col items-center gap-4 text-center">
              <span className="text-5xl">🎉</span>
              <h2 className="text-xl font-bold text-gray-800">
                Vous avez tout vu !
              </h2>
              <p className="text-gray-500 text-sm">
                {favorites.length > 0
                  ? `Vous avez sélectionné ${favorites.length} prénom${favorites.length > 1 ? "s" : ""}.`
                  : "Aucun prénom sélectionné pour l'instant."}
              </p>
              <button
                onClick={handleReset}
                className="mt-2 px-5 py-2 bg-violet-600 text-white rounded-full text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                Recommencer
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Favorites view */
        <div className="flex flex-col flex-1 px-4 py-6 gap-4 max-w-lg mx-auto w-full">
          <h2 className="text-lg font-semibold text-gray-800">
            {favoriteNames.length === 0
              ? "Aucun favori pour l'instant"
              : `${favoriteNames.length} prénom${favoriteNames.length > 1 ? "s" : ""} sélectionné${favoriteNames.length > 1 ? "s" : ""}`}
          </h2>

          {favoriteNames.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-5xl">💝</span>
              <p className="text-gray-500 text-sm">
                Appuyez sur ❤️ pendant la découverte pour ajouter des prénoms ici.
              </p>
              <button
                onClick={() => setMode("discover")}
                className="px-5 py-2 bg-violet-600 text-white rounded-full text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                Découvrir des prénoms
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {favoriteNames.map((n) => (
              <div
                key={n.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900">{n.name}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${GENDER_COLORS[n.gender]}`}
                    >
                      {GENDER_EMOJI[n.gender]}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        n.style === "classique"
                          ? "bg-amber-100 text-amber-700"
                          : n.style === "moderne"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {n.style}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {n.origin} · <span className="italic">{n.meaning}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveFavorite(n.id)}
                  className="text-gray-300 hover:text-rose-400 transition-colors text-lg"
                  title="Retirer des favoris"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {favoriteNames.length > 0 && (
            <button
              onClick={() => setFavorites([])}
              className="mt-2 text-sm text-gray-400 hover:text-red-500 transition-colors self-center"
            >
              Tout effacer
            </button>
          )}
        </div>
      )}
    </main>
  );
}
