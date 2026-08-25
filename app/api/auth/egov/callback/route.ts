import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  authenticateEgovExchangeCode,
  claimExchangeCode,
  EgovSsoError,
} from "@/lib/egov-sso";
import {
  createEgovSession,
  EGOV_SESSION_COOKIE,
  sealEgovSession,
  sessionCookieOptions,
} from "@/lib/egov-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validExchangeCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 1024 &&
    value.trim() === value &&
    !/\s/.test(value)
  );
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

async function completeLogin(exchangeCode: string) {
  if (!claimExchangeCode(exchangeCode)) {
    throw new EgovSsoError("invalid_exchange_code", 401);
  }

  const identity = await authenticateEgovExchangeCode(exchangeCode);
  const session = createEgovSession(identity.subject, identity.user);
  return { user: identity.user, token: sealEgovSession(session) };
}

function safeError(error: unknown, correlationId: string) {
  const known = error instanceof EgovSsoError;
  const code = known ? error.code : "service_unavailable";
  const status = known ? error.status : 503;
  console.error(`[eGov SSO] ${correlationId} ${code}`);
  return { code, status };
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Authentication request rejected.", correlationId },
      { status: 403 },
    );
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4096) {
      return NextResponse.json(
        { error: "Authentication request rejected.", correlationId },
        { status: 413 },
      );
    }

    const body = (await request.json()) as { exchangeCode?: unknown };
    if (!validExchangeCode(body.exchangeCode)) {
      return NextResponse.json(
        { error: "The eGovPH sign-in response was invalid.", correlationId },
        { status: 400 },
      );
    }

    const result = await completeLogin(body.exchangeCode);
    const response = NextResponse.json(
      { user: result.user },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    response.cookies.set(
      EGOV_SESSION_COOKIE,
      result.token,
      sessionCookieOptions(request.nextUrl),
    );
    return response;
  } catch (error) {
    const failure = safeError(error, correlationId);
    return NextResponse.json(
      {
        error: "We could not complete eGovPH sign-in. Please try again.",
        correlationId,
      },
      { status: failure.status },
    );
  }
}

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const exchangeCode = request.nextUrl.searchParams.get("exchange_code");

  if (!validExchangeCode(exchangeCode)) {
    return NextResponse.redirect(
      new URL(`/?auth_error=invalid_response&support=${correlationId}`, request.url),
      303,
    );
  }

  try {
    const result = await completeLogin(exchangeCode);
    const response = NextResponse.redirect(new URL("/agent", request.url), 303);
    response.cookies.set(
      EGOV_SESSION_COOKIE,
      result.token,
      sessionCookieOptions(request.nextUrl),
    );
    return response;
  } catch (error) {
    const failure = safeError(error, correlationId);
    return NextResponse.redirect(
      new URL(`/?auth_error=${failure.code}&support=${correlationId}`, request.url),
      303,
    );
  }
}
