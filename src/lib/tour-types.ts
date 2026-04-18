/** Tour API 목록/상세에서 자주 쓰는 공통 필드 */
export type TourAreaCode = {
  code: string;
  name: string;
  rnum?: number;
};

export type TourPlaceItem = {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
  firstimage?: string;
  firstimage2?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  areacode?: string;
  sigungucode?: string;
  createdtime?: string;
  modifiedtime?: string;
};

export type TourDetailCommon = {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  zipcode?: string;
  tel?: string;
  homepage?: string;
  overview?: string;
  mapx?: string;
  mapy?: string;
};

export type TourDetailIntroItem = Record<string, string | undefined>;

export type TourImageItem = {
  originimgurl?: string;
  imgname?: string;
  smallimageurl?: string;
  serialnum?: string;
};
