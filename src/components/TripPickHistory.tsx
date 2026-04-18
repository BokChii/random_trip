"use client";

import { useCallback, useEffect, useState } from "react";
import type { TripHistoryEntry } from "@/lib/trip-history";

type DetailPayload = {
  common: {
    contentid?: string;
    title?: string;
    addr1?: string;
    tel?: string;
    homepage?: string;
    overview?: string;
  } | null;
};

export function TripPickHistory({ entries }: { entries: TripHistoryEntry[] }) {
  const [open, setOpen] = useState<TripHistoryEntry | null>(null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setDetail(null);
      try {
        const qs = new URLSearchParams({
          contentId: open.contentid,
          contentTypeId: open.contenttypeid,
        });
        const res = await fetch(`/api/tour/detail?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "detail");
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onClose = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (entries.length === 0) return null;

  return (
    <>
      <div className="trip-card p-4">
        <p className="mb-3 text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">
          무작위 추천 기록
        </p>
        <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto sm:max-h-none sm:flex-row sm:flex-wrap">
          {entries.map((e) => (
            <li key={`${e.contentid}-${e.pickedAt}`}>
              <button
                type="button"
                onClick={() => setOpen(e)}
                className="flex w-full max-w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left transition hover:border-[var(--primary)] sm:max-w-[280px]"
              >
                {e.firstimage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.firstimage}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-xs text-[var(--text-tertiary)]">
                    없음
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-semibold text-[var(--text)]">{e.title}</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-sub)]">{e.typeLabel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={onClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pick-history-modal-title"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="pick-history-modal-title" className="text-lg font-bold text-[var(--text)]">
                {open.title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-[var(--text-sub)] hover:bg-[var(--bg)]"
              >
                닫기
              </button>
            </div>
            <p className="mb-4 text-sm text-[var(--text-sub)]">
              {open.typeLabel}
              {open.addr1 ? ` · ${open.addr1}` : ""}
            </p>
            {open.firstimage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={open.firstimage}
                alt=""
                className="mb-4 max-h-48 w-full rounded-xl border border-[var(--border)] object-cover"
              />
            ) : null}
            {loading ? (
              <p className="text-sm text-[var(--primary)]">상세 정보를 불러오는 중입니다.</p>
            ) : detail?.common?.overview ? (
              <div
                className="prose-trip max-h-[40vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: detail.common.overview }}
              />
            ) : (
              <p className="text-sm text-[var(--text-sub)]">소개 문구가 없습니다.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
