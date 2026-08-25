export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CALLBACK_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_CALLBACK_BYTES) {
    return Response.json({ received: false }, { status: 413 });
  }

  // The current catalog does not document a callback signature or body schema.
  // Acknowledge delivery without changing local payment state; the app always
  // reads the authoritative status from eGovPay's transaction endpoint.
  await request.text();
  return Response.json(
    { received: true, reconciliation: "status_lookup_required" },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
