import type { TourPlaceItem } from "@/lib/tour-types";
import { getContentTypeLabel } from "@/lib/content-type-label";

const STORAGE_KEY = "randomTrip_pickHistory_v1";
const MAX = 30;

export type TripHistoryEntry = {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1?: string;
  firstimage?: string;
  typeLabel: string;
  pickedAt: number;
};

function loadRaw(): TripHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is TripHistoryEntry =>
        x &&
        typeof x === "object" &&
        typeof (x as TripHistoryEntry).contentid === "string" &&
        typeof (x as TripHistoryEntry).title === "string"
    );
  } catch {
    return [];
  }
}

export function getTripHistory(): TripHistoryEntry[] {
  return loadRaw();
}

export function addTripHistoryFromPlace(p: TourPlaceItem): TripHistoryEntry[] {
  const entry: TripHistoryEntry = {
    contentid: p.contentid,
    contenttypeid: p.contenttypeid,
    title: p.title,
    addr1: p.addr1,
    firstimage: p.firstimage,
    typeLabel: getContentTypeLabel(p.contenttypeid),
    pickedAt: Date.now(),
  };
  const prev = loadRaw().filter((e) => e.contentid !== entry.contentid);
  const next = [entry, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}
