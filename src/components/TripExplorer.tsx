"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KakaoMapView } from "@/components/KakaoMapView";
import type { TourPlaceItem } from "@/lib/tour-types";

type AreaRow = { code: string; name: string };
type DetailPayload = {
  common: {
    contentid?: string;
    title?: string;
    addr1?: string;
    addr2?: string;
    tel?: string;
    homepage?: string;
    overview?: string;
  } | null;
  intro: Record<string, string | undefined> | null;
  images: { originimgurl?: string; imgname?: string }[];
};

export function TripExplorer() {
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [sigungu, setSigungu] = useState<AreaRow[]>([]);
  const [areaCode, setAreaCode] = useState("");
  const [sigunguCode, setSigunguCode] = useState("");
  const [contentTypeId, setContentTypeId] = useState("");

  const [places, setPlaces] = useState<TourPlaceItem[]>([]);
  const [selected, setSelected] = useState<TourPlaceItem | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [loading, setLoading] = useState({ areas: true, sigungu: false, places: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading((l) => ({ ...l, areas: true }));
      setError(null);
      try {
        const res = await fetch("/api/tour/area-codes");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "지역 목록을 불러오지 못했습니다.");
        if (!cancelled) setAreas(data.areas ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류");
      } finally {
        if (!cancelled) setLoading((l) => ({ ...l, areas: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onAreaChange = useCallback((value: string) => {
    setAreaCode(value);
    setSigunguCode("");
    setSigungu([]);
    if (!value) {
      setPlaces([]);
      setSelected(null);
      setFocusId(null);
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    if (!areaCode) return;
    let cancelled = false;
    (async () => {
      setLoading((l) => ({ ...l, sigungu: true }));
      setError(null);
      try {
        const res = await fetch(`/api/tour/sigungu?areaCode=${encodeURIComponent(areaCode)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "시군구 목록을 불러오지 못했습니다.");
        if (!cancelled) {
          setSigungu(data.sigungu ?? []);
          setSigunguCode("");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류");
      } finally {
        if (!cancelled) setLoading((l) => ({ ...l, sigungu: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [areaCode]);

  useEffect(() => {
    if (!areaCode) return;
    let cancelled = false;
    (async () => {
      setLoading((l) => ({ ...l, places: true }));
      setError(null);
      try {
        const qs = new URLSearchParams({
          areaCode,
          numOfRows: "200",
          pageNo: "1",
        });
        if (sigunguCode) qs.set("sigunguCode", sigunguCode);
        if (contentTypeId.trim()) qs.set("contentTypeId", contentTypeId.trim());
        const res = await fetch(`/api/tour/places?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "여행지 목록을 불러오지 못했습니다.");
        if (!cancelled) {
          setPlaces(data.places ?? []);
          setSelected(null);
          setFocusId(null);
          setDetail(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류");
      } finally {
        if (!cancelled) setLoading((l) => ({ ...l, places: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [areaCode, sigunguCode, contentTypeId]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetail(null);
      try {
        const qs = new URLSearchParams({
          contentId: selected.contentid,
          contentTypeId: selected.contenttypeid,
        });
        const res = await fetch(`/api/tour/detail?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "상세 정보를 불러오지 못했습니다.");
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const onSelectPlace = useCallback((p: TourPlaceItem) => {
    setSelected(p);
    setFocusId(p.contentid);
  }, []);

  const randomPick = useCallback(() => {
    if (places.length === 0) return;
    const idx = Math.floor(Math.random() * places.length);
    const p = places[idx];
    setSelected(p);
    setFocusId(p.contentid);
  }, [places]);

  const overviewHtml = useMemo(() => {
    const raw = detail?.common?.overview;
    if (!raw) return null;
    return raw;
  }, [detail]);

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 md:py-10">
      <header className="relative space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-white bg-white/80 px-4 py-1.5 text-sm font-semibold text-orange-600 shadow-sm backdrop-blur-sm">
          <span className="text-lg leading-none" aria-hidden>
            ✈️
          </span>
          <span className="tracking-wide">국내 여행 · 랜덤 스팟</span>
        </div>
        <div className="space-y-2">
          <h1 className="font-display max-w-xl text-4xl font-extrabold leading-[1.15] tracking-tight md:text-5xl">
            <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-sky-500 bg-clip-text text-transparent">
              오늘은 어디로
            </span>
            <br />
            <span className="text-stone-800">떠날까?</span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-stone-600 md:text-lg">
            지역만 고르면 지도에 핀이 쫙!{" "}
            <span className="font-semibold text-orange-500">랜덤 뽑기</span>로 오늘의 코스를 정해 봐요.
          </p>
        </div>
      </header>

      {error ? (
        <div
          className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
        <div className="space-y-5">
          <div className="trip-card p-5 md:p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
              필터
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex min-w-[140px] flex-col gap-2 text-xs font-bold text-stone-500">
                시 · 도
                <select
                  className="trip-input px-4 py-2.5 text-sm font-medium text-stone-800"
                  value={areaCode}
                  onChange={(e) => onAreaChange(e.target.value)}
                  disabled={loading.areas}
                >
                  <option value="">어디부터?</option>
                  {areas.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[140px] flex-col gap-2 text-xs font-bold text-stone-500">
                시군구
                <select
                  className="trip-input px-4 py-2.5 text-sm font-medium text-stone-800"
                  value={sigunguCode}
                  onChange={(e) => setSigunguCode(e.target.value)}
                  disabled={!areaCode || loading.sigungu}
                >
                  <option value="">전체</option>
                  {sigungu.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[160px] flex-col gap-2 text-xs font-bold text-stone-500">
                유형
                <select
                  className="trip-input px-4 py-2.5 text-sm font-medium text-stone-800"
                  value={contentTypeId}
                  onChange={(e) => setContentTypeId(e.target.value)}
                >
                  <option value="">전체</option>
                  <option value="12">관광지</option>
                  <option value="14">문화시설</option>
                  <option value="15">축제/공연/행사</option>
                  <option value="25">여행코스</option>
                  <option value="28">레포츠</option>
                  <option value="32">숙박</option>
                  <option value="38">쇼핑</option>
                  <option value="39">음식점</option>
                </select>
              </label>
              <button
                type="button"
                onClick={randomPick}
                disabled={places.length === 0 || loading.places}
                className="trip-btn-primary ml-auto px-5 py-3 text-sm disabled:opacity-40"
              >
                🎲 랜덤 뽑기
              </button>
            </div>
          </div>

          <KakaoMapView
            places={places}
            focusContentId={focusId}
            onSelectPlace={onSelectPlace}
            areaCode={areaCode}
            sigunguCode={sigunguCode}
          />

          <div className="space-y-1">
            <p className="text-sm font-medium text-stone-500">
              {loading.places
                ? "목록 불러오는 중…"
                : areaCode
                  ? `지도에 ${places.length}곳 (최대 200건/요청)`
                  : "지역을 고르면 지도에 표시돼요."}
            </p>
            {!loading.places && areaCode && places.length === 0 ? (
              <p className="text-sm font-medium text-amber-700">
                이 조건에 맞는 곳이 없어요. 유형을 바꿔 보세요!
              </p>
            ) : null}
          </div>
        </div>

        <aside className="trip-card-aside sticky top-6 space-y-4 p-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              📍
            </span>
            <h2 className="font-display text-xl font-bold text-stone-800">이번 스팟</h2>
          </div>
          {!selected ? (
            <p className="text-sm leading-relaxed text-stone-500">
              지도에서 핀을 누르거나 <span className="font-semibold text-orange-500">랜덤 뽑기</span>로 골라
              봐요.
            </p>
          ) : detailLoading ? (
            <p className="text-sm font-medium text-sky-600">상세 불러오는 중…</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold leading-snug text-stone-900">{selected.title}</h3>
                <p className="mt-1 text-xs text-stone-400">
                  ID {selected.contentid} · 타입 {selected.contenttypeid}
                </p>
              </div>
              {selected.firstimage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.firstimage}
                  alt=""
                  className="max-h-48 w-full rounded-2xl object-cover ring-2 ring-white shadow-md"
                />
              ) : null}
              <dl className="space-y-3 text-sm text-stone-600">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    주소
                  </dt>
                  <dd className="font-medium">{detail?.common?.addr1 ?? selected.addr1 ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    전화
                  </dt>
                  <dd className="font-medium">{detail?.common?.tel ?? selected.tel ?? "—"}</dd>
                </div>
                {detail?.common?.homepage ? (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      홈페이지
                    </dt>
                    <dd
                      className="break-all font-medium text-sky-600 underline-offset-2 hover:underline"
                      dangerouslySetInnerHTML={{ __html: detail.common.homepage }}
                    />
                  </div>
                ) : null}
              </dl>
              {overviewHtml ? (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-400">
                    소개
                  </h4>
                  <div
                    className="prose-trip max-h-[320px] overflow-y-auto rounded-xl bg-white/60 p-3 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: overviewHtml }}
                  />
                </div>
              ) : null}
              {detail?.intro && Object.keys(detail.intro).length > 0 ? (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-400">
                    운영 · 안내
                  </h4>
                  <ul className="space-y-1 text-sm text-stone-600">
                    {Object.entries(detail.intro)
                      .filter(([, v]) => v && String(v).trim() !== "")
                      .slice(0, 12)
                      .map(([k, v]) => (
                        <li key={k}>
                          <span className="text-stone-400">{k}</span>: {v}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
              {detail?.images && detail.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {detail.images.slice(0, 4).map((im, i) =>
                    im.originimgurl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${im.originimgurl}-${i}`}
                        src={im.originimgurl}
                        alt={im.imgname ?? ""}
                        className="h-24 w-full rounded-xl object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : null
                  )}
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
