/**
 * 지도 디버그 로그. 개발 모드 또는 NEXT_PUBLIC_DEBUG_MAP=1 일 때만 출력.
 * 키 값은 절대 로그하지 않습니다.
 */
export function isMapDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEBUG_MAP === "1"
  );
}

export function mapLog(...args: unknown[]): void {
  if (isMapDebugEnabled()) {
    console.info("[KakaoMap]", ...args);
  }
}
