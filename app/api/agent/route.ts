import { NextRequest } from "next/server";
import { runHeadlessAgent } from "@/lib/agent/headless";
import { AiRouterError } from "@/lib/ai/egov-router";
import { EGOV_SESSION_COOKIE, openEgovSession } from "@/lib/egov-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const session = openEgovSession(
      request.cookies.get(EGOV_SESSION_COOKIE)?.value,
    );
    const result = await runHeadlessAgent(
      session
        ? {
            ...body,
            user: {
              name: session.user.name,
              firstName: session.user.firstName,
              mobile: session.user.mobile,
              email: session.user.email,
              sex: session.user.sex,
              address: session.user.address,
            },
          }
        : body,
    );
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = error instanceof AiRouterError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "The AI request failed.";

    return Response.json(
      {
        error: message,
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
