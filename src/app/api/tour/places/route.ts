import { NextResponse } from "next/server";
import { TourApiError, fetchTourJson } from "@/lib/tour-api";
import { getTourItemsBody } from "@/lib/tour-normalize";
import type { TourPlaceItem } from "@/lib/tour-types";

export const runtime = "nodejs";

const MAX_ROWS = 200;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const areaCode = searchParams.get("areaCode");
  if (!areaCode) {
    return NextResponse.json({ error: "areaCode is required" }, { status: 400 });
  }

  const sigunguCode = searchParams.get("sigunguCode") ?? "";
  const pageNo = Math.max(1, Number(searchParams.get("pageNo") ?? 1) || 1);
  const numOfRows = Math.min(
    MAX_ROWS,
    Math.max(1, Number(searchParams.get("numOfRows") ?? 100) || 100)
  );
  const contentTypeId = searchParams.get("contentTypeId") ?? "";

  try {
    const data = await fetchTourJson<{
      response?: {
        body?: {
          items?: { item?: unknown };
          totalCount?: string | number;
          numOfRows?: number;
          pageNo?: number;
        };
      };
    }>("areaBasedList2", {
      areaCode,
      ...(sigunguCode ? { sigunguCode } : {}),
      ...(contentTypeId ? { contentTypeId } : {}),
      numOfRows,
      pageNo,
      arrange: "C",
    });

    const body = data.response?.body;
    const items = getTourItemsBody<TourPlaceItem>(data);

    return NextResponse.json(
      {
        places: items,
        totalCount: body?.totalCount != null ? Number(body.totalCount) : items.length,
        pageNo: body?.pageNo ?? pageNo,
        numOfRows: body?.numOfRows ?? items.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (e) {
    const status = e instanceof TourApiError && e.status ? e.status : 500;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}
