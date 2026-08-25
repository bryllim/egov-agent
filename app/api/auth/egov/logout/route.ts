import { NextRequest, NextResponse } from "next/server";
import {
  EGOV_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/egov-session";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Sign-out request rejected." }, { status: 403 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(EGOV_SESSION_COOKIE, "", {
    ...sessionCookieOptions(request.nextUrl),
    maxAge: 0,
  });
  return response;
}
