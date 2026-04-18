/**
 * Tour API 지역코드(areaCode)별 대략적 중심 (한국관광공사 지역코드 표 기준).
 * 시·도만 선택했을 때 지도 이동용.
 */
export const KOREA_OVERVIEW = {
  lat: 36.34,
  lng: 127.77,
  /** 카카오맵: 숫자가 클수록 축소(멀리) — 한반도 전체 */
  level: 13,
} as const;

/** areaCode 문자열 → 중심 좌표 + 권장 레벨 */
export const AREA_CENTER: Record<string, { lat: number; lng: number; level: number }> = {
  "1": { lat: 37.5665, lng: 126.978, level: 9 }, // 서울
  "2": { lat: 37.4563, lng: 126.7052, level: 10 }, // 인천
  "3": { lat: 36.3504, lng: 127.3845, level: 10 }, // 대전
  "4": { lat: 35.8714, lng: 128.6014, level: 10 }, // 대구
  "5": { lat: 35.1595, lng: 126.8526, level: 10 }, // 광주
  "6": { lat: 35.1796, lng: 129.0756, level: 10 }, // 부산
  "7": { lat: 35.5384, lng: 129.3114, level: 10 }, // 울산
  "8": { lat: 36.48, lng: 127.289, level: 10 }, // 세종
  "31": { lat: 37.4138, lng: 127.5183, level: 10 }, // 경기
  "32": { lat: 37.8228, lng: 128.1555, level: 10 }, // 강원
  "33": { lat: 36.8, lng: 127.7, level: 10 }, // 충북
  "34": { lat: 36.5184, lng: 126.8, level: 10 }, // 충남
  "35": { lat: 35.7175, lng: 127.153, level: 10 }, // 전북
  "36": { lat: 34.8679, lng: 126.991, level: 10 }, // 전남
  "37": { lat: 36.4919, lng: 128.8889, level: 10 }, // 경북
  "38": { lat: 35.4606, lng: 128.2132, level: 10 }, // 경남
  "39": { lat: 33.4996, lng: 126.5312, level: 10 }, // 제주
};

export function getAreaCenter(areaCode: string) {
  return AREA_CENTER[areaCode] ?? null;
}
