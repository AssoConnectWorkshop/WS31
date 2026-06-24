import type { Activity } from "@/data/activities";

/**
 * Stockage partagé (localStorage) des activités créées par l'admin.
 * Permet aux activités créées dans la vue admin (/activities) d'apparaître
 * dans la vue membre (/explore) avec leur image — sans backend.
 */
const KEY = "ws31_custom_activities";

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): Activity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Activity[]) : [];
  } catch {
    return [];
  }
}

function write(list: Activity[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  listeners.forEach((l) => l());
}

export function getCustomActivities(): Activity[] {
  return read();
}

export function addCustomActivity(a: Activity) {
  write([...read(), a]);
}

export function subscribeActivities(cb: Listener): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}
