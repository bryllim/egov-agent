import { DEMO_PROFILE } from "@/app/agent/brain";
import { type ETravelDetails } from "@/app/agent/ai-contract";
import {
  buildFormHTML,
  PRINT_FILE_PREVIEWS,
  type PrintKind,
} from "@/app/agent/forms";

function isPrintKind(value: string): value is PrintKind {
  return Object.hasOwn(PRINT_FILE_PREVIEWS, value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;

  if (!isPrintKind(kind)) {
    return new Response("Document not found.", { status: 404 });
  }

  const search = new URL(_request.url).searchParams;
  const direction = search.get("direction");
  const eTravel: ETravelDetails | undefined =
    kind === "etravel-qr"
      ? {
          direction:
            direction === "arrival" || direction === "departure"
              ? direction
              : null,
          origin: search.get("origin"),
          destination: search.get("destination"),
          travelDate: search.get("date"),
          travelTime: search.get("time"),
          flightNumber: search.get("flight"),
        }
      : undefined;
  const html = buildFormHTML(
    kind,
    {
      ...DEMO_PROFILE,
      pcn: "6302-6431-0891-2530",
    },
    { eTravel }
  );

  if (!html) {
    return new Response("Document not found.", { status: 404 });
  }

  return new Response(html, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
