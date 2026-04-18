/** Tour API contentTypeId → 한글 라벨 */
export function getContentTypeLabel(id: string): string {
  const map: Record<string, string> = {
    "12": "관광지",
    "14": "문화시설",
    "15": "축제/공연/행사",
    "25": "여행코스",
    "28": "레포츠",
    "32": "숙박",
    "38": "쇼핑",
    "39": "음식점",
  };
  return map[id] ?? `타입 ${id}`;
}
