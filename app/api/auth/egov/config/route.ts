import { getEgovSsoPublicConfig, EgovSsoError } from "@/lib/egov-sso";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(getEgovSsoPublicConfig(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status = error instanceof EgovSsoError ? error.status : 503;
    return Response.json(
      { error: "eGovPH sign-in is not configured." },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
