/**
 * Tour API mapx/mapy → WGS84 (경도/위도).
 * 응답이 정수 스케일(1e7)이거나 소수 문자열인 경우 모두 처리.
 */
export function parseTourLatLng(
  mapx: string | number | undefined,
  mapy: string | number | undefined
): { lat: number; lng: number } | null {
  if (mapx === undefined || mapy === undefined) return null;
  const x = typeof mapx === "number" ? mapx : parseFloat(String(mapx).trim());
  const y = typeof mapy === "number" ? mapy : parseFloat(String(mapy).trim());
  if (Number.isNaN(x) || Number.isNaN(y)) return null;

  // 스케일된 정수형 (예: 1269816113)
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    return { lng: x / 10_000_000, lat: y / 10_000_000 };
  }

  // Tour API는 mapx=경도, mapy=위도
  return { lng: x, lat: y };
}
