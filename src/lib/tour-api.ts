/** 공공데이터포털 한국관광공사 KorService2 (HTTPS 권장) */
const TOUR_BASE = "https://apis.data.go.kr/B551011/KorService2";

export class TourApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "TourApiError";
  }
}

function getServiceKey(): string {
  const key = process.env.TOUR_API_SERVICE_KEY?.trim();
  if (!key) {
    throw new TourApiError("TOUR_API_SERVICE_KEY is not set");
  }
  return key;
}

export type TourFetchParams = Record<string, string | number | undefined>;

export async function fetchTourJson<T>(
  operation: string,
  params: TourFetchParams = {}
): Promise<T> {
  const serviceKey = getServiceKey();
  const search = new URLSearchParams();
  search.set("serviceKey", serviceKey);
  search.set("MobileApp", "RandomTrip");
  search.set("MobileOS", "ETC");
  search.set("_type", "json");

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    search.set(k, String(v));
  }

  const url = `${TOUR_BASE}/${operation}?${search.toString()}`;
  const res = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new TourApiError(`Tour API HTTP ${res.status}`, res.status);
  }

  const data = (await res.json()) as {
    response?: {
      header?: { resultCode?: string; resultMsg?: string };
      body?: unknown;
    };
  };

  const code = data.response?.header?.resultCode;
  if (code && code !== "0000" && code !== "00") {
    throw new TourApiError(
      data.response?.header?.resultMsg ?? `Tour API error ${code}`
    );
  }

  return data as T;
}
