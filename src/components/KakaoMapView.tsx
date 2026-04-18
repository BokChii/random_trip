"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import Script from "next/script";
import { parseTourLatLng } from "@/lib/coords";
import { KOREA_OVERVIEW, resolveProvinceCenter } from "@/lib/korea-region-centers";
import { mapLog } from "@/lib/map-debug";
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

const IW_STYLE =
  "padding:10px 14px;font-size:13px;font-weight:600;max-width:240px;border-radius:12px;background:#fff;color:#191f28;box-shadow:0 2px 8px rgba(0,0,0,.08);";

export function KakaoMapView({
  places,
  focusContentId,
  onSelectPlace,
  areaCode,
  areaName,
  sigunguCode,
}: {
  places: TourPlaceItem[];
  focusContentId: string | null;
  onSelectPlace: (p: TourPlaceItem) => void;
  areaCode: string;
  /** 시·도 선택 드롭다운의 한글명(지역코드와 불일치 시 지도 중심 보정용) */
  areaName?: string;
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

  useEffect(() => {
    mapLog("mount", {
      hasAppKey: Boolean(appKey),
      appKeyLength: appKey?.length ?? 0,
    });
  }, [appKey]);

  const syncMarkers = useCallback(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) {
      mapLog("syncMarkers skip", { hasKakao: Boolean(kakao), hasMap: Boolean(map) });
      return;
    }

    let validCount = 0;
    const nextKeys = new Set<string>();
    for (const p of places) {
      const ll = parseTourLatLng(p.mapx, p.mapy);
      if (!ll) continue;
      validCount += 1;
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
            content: `<div style="${IW_STYLE}">${escapeHtml(p.title)}</div>`,
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

    mapLog("syncMarkers done", {
      placesTotal: places.length,
      markersWithCoords: validCount,
      markerKeys: nextKeys.size,
    });
  }, [places, onSelectPlace]);

  const initMap = useCallback(() => {
    const kakao = window.kakao;
    const el = containerRef.current;
    if (!kakao?.maps || !el) {
      mapLog("initMap abort", { hasKakaoMaps: Boolean(kakao?.maps), hasContainer: Boolean(el) });
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      initAttemptsRef.current += 1;
      mapLog("initMap retry (container size)", {
        width: rect.width,
        height: rect.height,
        attempt: initAttemptsRef.current,
      });
      if (initAttemptsRef.current > 40) {
        mapLog("initMap abort: max retries for container size");
        return;
      }
      window.requestAnimationFrame(() => initMapRef.current());
      return;
    }
    initAttemptsRef.current = 0;

    if (mapCreatedRef.current) {
      mapRef.current?.relayout();
      syncMarkers();
      mapLog("initMap: map already exists, relayout only");
      return;
    }

    const center = new kakao.maps.LatLng(KOREA_OVERVIEW.lat, KOREA_OVERVIEW.lng);
    const map = new kakao.maps.Map(el, { center, level: KOREA_OVERVIEW.level });
    mapRef.current = map;
    mapCreatedRef.current = true;
    mapLog("initMap: map instance created", {
      center: KOREA_OVERVIEW,
      level: KOREA_OVERVIEW.level,
    });
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
    if (!window.kakao?.maps) {
      mapLog("useLayoutEffect: window.kakao.maps not ready yet");
      return;
    }
    window.kakao.maps.load(() => {
      mapLog("maps.load (from useLayoutEffect)");
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

  useEffect(() => {
    if (focusContentId) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) {
      mapLog("regionView skip", { hasMap: Boolean(map), hasKakao: Boolean(kakao?.maps) });
      return;
    }
    if (infoRef.current) infoRef.current.close();

    if (!areaCode) {
      map.setCenter(new kakao.maps.LatLng(KOREA_OVERVIEW.lat, KOREA_OVERVIEW.lng));
      map.setLevel(KOREA_OVERVIEW.level);
      mapLog("regionView", { mode: "korea_overview" });
      window.requestAnimationFrame(() => map.relayout());
      return;
    }

    const province = resolveProvinceCenter(areaCode, areaName);

    if (!sigunguCode) {
      if (province) {
        map.setCenter(new kakao.maps.LatLng(province.lat, province.lng));
        map.setLevel(province.level);
        mapLog("regionView", {
          mode: "province_center",
          areaCode,
          areaName: areaName ?? "",
          level: province.level,
        });
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
          mapLog("regionView", { mode: "province_bounds_from_places", points: coords.length });
        } else if (coords.length === 1) {
          const c = coords[0];
          map.setCenter(new kakao.maps.LatLng(c.lat, c.lng));
          map.setLevel(9);
          mapLog("regionView", { mode: "province_single_place" });
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
      mapLog("regionView", { mode: "sigungu_bounds", points: coords.length });
    } else if (coords.length === 1) {
      const c = coords[0];
      map.setCenter(new kakao.maps.LatLng(c.lat, c.lng));
      map.setLevel(8);
      mapLog("regionView", { mode: "sigungu_single" });
    } else if (province) {
      map.setCenter(new kakao.maps.LatLng(province.lat, province.lng));
      map.setLevel(9);
      mapLog("regionView", { mode: "sigungu_fallback_province", areaCode, areaName: areaName ?? "" });
    }
    window.requestAnimationFrame(() => map.relayout());
  }, [areaCode, areaName, sigunguCode, places, focusContentId]);

  useEffect(() => {
    if (!focusContentId) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const target = places.find((p) => p.contentid === focusContentId);
    if (!target) {
      mapLog("focusPlace skip", { reason: "target not found", focusContentId });
      return;
    }
    const ll = parseTourLatLng(target.mapx, target.mapy);
    if (!ll) {
      mapLog("focusPlace skip", { reason: "no coords", contentId: focusContentId });
      return;
    }
    const pos = new kakao.maps.LatLng(ll.lat, ll.lng);
    map.setCenter(pos);
    map.setLevel(5);
    mapLog("focusPlace", { contentId: focusContentId, title: target.title });

    const key = placeKey(target);
    const m = markersRef.current.get(key);
    if (infoRef.current) infoRef.current.close();
    if (m) {
      const iw = new kakao.maps.InfoWindow({
        content: `<div style="${IW_STYLE}">${escapeHtml(target.title)}</div>`,
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
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-sub)]">
        <p>
          지도를 표시하려면{" "}
          <code className="rounded-md bg-[var(--bg)] px-2 py-0.5 font-mono text-xs text-[var(--text)]">
            NEXT_PUBLIC_KAKAO_MAP_APP_KEY
          </code>
          를 설정하세요.
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
          mapLog("script onLoad: sdk.js loaded");
          window.kakao?.maps.load(() => {
            mapLog("maps.load callback (script onLoad)");
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
        className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
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
