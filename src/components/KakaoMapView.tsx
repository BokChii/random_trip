"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import Script from "next/script";
import { parseTourLatLng } from "@/lib/coords";
import { KOREA_OVERVIEW, getAreaCenter } from "@/lib/korea-region-centers";
import type { TourPlaceItem } from "@/lib/tour-types";

type KakaoMapInstance = {
  setCenter: (latlng: unknown) => void;
  setLevel: (level: number) => void;
  relayout: () => void;
  setBounds: (bounds: unknown) => void;
};

type KakaoMarkerInstance = {
  setMap: (map: unknown | null) => void;
  setPosition: (p: unknown) => void;
};

type KakaoLatLngBounds = {
  extend: (latlng: unknown) => void;
};

type KakaoNamespace = {
  maps: {
    Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMapInstance;
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new () => KakaoLatLngBounds;
    Marker: new (options: { position: unknown; map?: unknown }) => KakaoMarkerInstance;
    event: {
      addListener: (
        target: unknown,
        type: string,
        handler: () => void
      ) => void;
    };
    InfoWindow: new (options: { content: string }) => {
      open: (map: unknown, marker: unknown) => void;
      close: () => void;
    };
    load: (cb: () => void) => void;
  };
};

declare global {
  interface Window {
    kakao?: KakaoNamespace;
  }
}

function placeKey(p: TourPlaceItem) {
  return `${p.contentid}-${p.contenttypeid}`;
}

export function KakaoMapView({
  places,
  focusContentId,
  onSelectPlace,
  areaCode,
  sigunguCode,
}: {
  places: TourPlaceItem[];
  focusContentId: string | null;
  onSelectPlace: (p: TourPlaceItem) => void;
  areaCode: string;
  sigunguCode: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<Map<string, { marker: KakaoMarkerInstance; place: TourPlaceItem }>>(
    new Map()
  );
  const infoRef = useRef<{ close: () => void } | null>(null);
  const mapCreatedRef = useRef(false);
  const initAttemptsRef = useRef(0);
  const initMapRef = useRef<() => void>(() => {});
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  const syncMarkers = useCallback(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;

    const nextKeys = new Set<string>();
    for (const p of places) {
      const ll = parseTourLatLng(p.mapx, p.mapy);
      if (!ll) continue;
      const key = placeKey(p);
      nextKeys.add(key);
      const pos = new kakao.maps.LatLng(ll.lat, ll.lng);
      const existing = markersRef.current.get(key);
      if (existing) {
        existing.marker.setPosition(pos);
        existing.place = p;
      } else {
        const marker = new kakao.maps.Marker({ position: pos, map });
        kakao.maps.event.addListener(marker, "click", () => {
          onSelectPlace(p);
          if (infoRef.current) infoRef.current.close();
          const iw = new kakao.maps.InfoWindow({
            content: `<div style="padding:10px 14px;font-size:13px;font-weight:600;max-width:220px;border-radius:12px;background:#fff;color:#1c1917;box-shadow:0 4px 12px rgba(0,0,0,.1);">${escapeHtml(p.title)}</div>`,
          });
          infoRef.current = iw;
          iw.open(map, marker);
        });
        markersRef.current.set(key, { marker, place: p });
      }
    }

    for (const [key, val] of markersRef.current) {
      if (!nextKeys.has(key)) {
        val.marker.setMap(null);
        markersRef.current.delete(key);
      }
    }
  }, [places, onSelectPlace]);

  const initMap = useCallback(() => {
    const kakao = window.kakao;
    const el = containerRef.current;
    if (!kakao?.maps || !el) return;

    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      initAttemptsRef.current += 1;
      if (initAttemptsRef.current > 40) return;
      window.requestAnimationFrame(() => initMapRef.current());
      return;
    }
    initAttemptsRef.current = 0;

    if (mapCreatedRef.current) {
      mapRef.current?.relayout();
      syncMarkers();
      return;
    }

    const center = new kakao.maps.LatLng(KOREA_OVERVIEW.lat, KOREA_OVERVIEW.lng);
    const map = new kakao.maps.Map(el, { center, level: KOREA_OVERVIEW.level });
    mapRef.current = map;
    mapCreatedRef.current = true;
    syncMarkers();

    const relayoutSoon = () => {
      map.relayout();
      syncMarkers();
    };
    window.requestAnimationFrame(relayoutSoon);
    window.setTimeout(relayoutSoon, 120);
  }, [syncMarkers]);

  useLayoutEffect(() => {
    initMapRef.current = initMap;
  }, [initMap]);

  useLayoutEffect(() => {
    if (!appKey) return;
    if (!window.kakao?.maps) return;
    window.kakao.maps.load(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          initMapRef.current();
        });
      });
    });
  }, [appKey]);

  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  /** 시·도 / 시군구에 맞춰 지도 뷰 이동 (랜덤 포커스와 별개) */
  useEffect(() => {
    if (focusContentId) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    if (infoRef.current) infoRef.current.close();

    if (!areaCode) {
      map.setCenter(new kakao.maps.LatLng(KOREA_OVERVIEW.lat, KOREA_OVERVIEW.lng));
      map.setLevel(KOREA_OVERVIEW.level);
      window.requestAnimationFrame(() => map.relayout());
      return;
    }

    const province = getAreaCenter(areaCode);

    if (!sigunguCode) {
      if (province) {
        map.setCenter(new kakao.maps.LatLng(province.lat, province.lng));
        map.setLevel(province.level);
      } else {
        const coords: { lat: number; lng: number }[] = [];
        for (const p of places) {
          const ll = parseTourLatLng(p.mapx, p.mapy);
          if (ll) coords.push(ll);
        }
        if (coords.length >= 2) {
          const bounds = new kakao.maps.LatLngBounds();
          for (const c of coords) {
            bounds.extend(new kakao.maps.LatLng(c.lat, c.lng));
          }
          map.setBounds(bounds);
        } else if (coords.length === 1) {
          const c = coords[0];
          map.setCenter(new kakao.maps.LatLng(c.lat, c.lng));
          map.setLevel(9);
        }
      }
      window.requestAnimationFrame(() => map.relayout());
      return;
    }

    const coords: { lat: number; lng: number }[] = [];
    for (const p of places) {
      const ll = parseTourLatLng(p.mapx, p.mapy);
      if (ll) coords.push(ll);
    }

    if (coords.length >= 2) {
      const bounds = new kakao.maps.LatLngBounds();
      for (const c of coords) {
        bounds.extend(new kakao.maps.LatLng(c.lat, c.lng));
      }
      map.setBounds(bounds);
    } else if (coords.length === 1) {
      const c = coords[0];
      map.setCenter(new kakao.maps.LatLng(c.lat, c.lng));
      map.setLevel(8);
    } else if (province) {
      map.setCenter(new kakao.maps.LatLng(province.lat, province.lng));
      map.setLevel(9);
    }
    window.requestAnimationFrame(() => map.relayout());
  }, [areaCode, sigunguCode, places, focusContentId]);

  useEffect(() => {
    if (!focusContentId) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const target = places.find((p) => p.contentid === focusContentId);
    if (!target) return;
    const ll = parseTourLatLng(target.mapx, target.mapy);
    if (!ll) return;
    const pos = new kakao.maps.LatLng(ll.lat, ll.lng);
    map.setCenter(pos);
    map.setLevel(5);

    const key = placeKey(target);
    const m = markersRef.current.get(key);
    if (infoRef.current) infoRef.current.close();
    if (m) {
      const iw = new kakao.maps.InfoWindow({
        content: `<div style="padding:10px 14px;font-size:13px;font-weight:600;max-width:240px;border-radius:12px;background:#fff;color:#1c1917;box-shadow:0 4px 12px rgba(0,0,0,.1);">${escapeHtml(target.title)}</div>`,
      });
      infoRef.current = iw;
      iw.open(map, m.marker);
    }
  }, [focusContentId, places]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.relayout();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [places.length]);

  if (!appKey) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50/90 p-6 text-center text-sm font-medium text-amber-900">
        <p>
          카카오맵을 쓰려면{" "}
          <code className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs text-stone-800 shadow-sm">
            NEXT_PUBLIC_KAKAO_MAP_APP_KEY
          </code>
          를 .env.local에 설정하세요.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => {
          window.kakao?.maps.load(() => {
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                initMap();
              });
            });
          });
        }}
      />
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-2xl border-[3px] border-white bg-sky-100 shadow-[0_8px_40px_rgba(14,165,233,0.15),0_4px_12px_rgba(251,146,60,0.12)] ring-2 ring-sky-200/80"
        style={{ height: "min(60vh, 520px)", minHeight: 320 }}
        role="presentation"
      />
    </>
  );
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
