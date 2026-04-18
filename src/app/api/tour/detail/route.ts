import { NextResponse } from "next/server";
import { TourApiError, fetchTourJson } from "@/lib/tour-api";
import { asItemArray } from "@/lib/tour-normalize";
import type {
  TourDetailCommon,
  TourDetailIntroItem,
  TourImageItem,
} from "@/lib/tour-types";

export const runtime = "nodejs";

function firstItem<T>(raw: unknown): T | null {
  const arr = asItemArray<T>(raw);
  return arr[0] ?? null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contentId = searchParams.get("contentId");
  const contentTypeId = searchParams.get("contentTypeId");
  if (!contentId || !contentTypeId) {
    return NextResponse.json(
      { error: "contentId and contentTypeId are required" },
      { status: 400 }
    );
  }

  try {
    const [commonRes, introRes, imageRes] = await Promise.all([
      fetchTourJson<{
        response?: { body?: { items?: { item?: unknown } } };
      }>("detailCommon2", {
        contentId,
        contentTypeId,
        defaultYN: "Y",
        firstImageYN: "Y",
        addrinfoYN: "Y",
        mapinfoYN: "Y",
        overviewYN: "Y",
      }),
      fetchTourJson<{
        response?: { body?: { items?: { item?: unknown } } };
      }>("detailIntro2", {
        contentId,
        contentTypeId,
      }),
      fetchTourJson<{
        response?: { body?: { items?: { item?: unknown } } };
      }>("detailImage2", {
        contentId,
        contentTypeId,
        imageYN: "Y",
        subImageYN: "Y",
        numOfRows: 20,
        pageNo: 1,
      }),
    ]);

    const common = firstItem<TourDetailCommon>(
      commonRes.response?.body?.items?.item
    );
    const intro = firstItem<TourDetailIntroItem>(
      introRes.response?.body?.items?.item
    );
    const images = asItemArray<TourImageItem>(
      imageRes.response?.body?.items?.item
    );

    return NextResponse.json(
      { common, intro, images },
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
