import { NextRequest, NextResponse } from "next/server";
import { EGOV_SESSION_COOKIE, openEgovSession } from "@/lib/egov-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = openEgovSession(request.cookies.get(EGOV_SESSION_COOKIE)?.value);

  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return NextResponse.json(
    { authenticated: true, user: session.user },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
