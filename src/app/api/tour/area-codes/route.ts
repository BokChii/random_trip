import { NextResponse } from "next/server";
import { TourApiError, fetchTourJson } from "@/lib/tour-api";
import { getTourItemsBody } from "@/lib/tour-normalize";
import type { TourAreaCode } from "@/lib/tour-types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await fetchTourJson<{
      response?: { body?: { items?: { item?: unknown } } };
    }>("areaCode2", {
      numOfRows: 50,
      pageNo: 1,
    });

    const items = getTourItemsBody<TourAreaCode & { code?: string; name?: string }>(
      data
    ).map((row) => ({
      code: String(row.code ?? ""),
      name: String(row.name ?? ""),
      rnum: row.rnum,
    }));

    return NextResponse.json(
      { areas: items.filter((a) => a.code) },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (e) {
    const status = e instanceof TourApiError && e.status ? e.status : 500;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}
