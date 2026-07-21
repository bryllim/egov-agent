import { AiRouterError } from "@/lib/ai/egov-router";
import { runHeadlessAgent } from "@/lib/agent/headless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await runHeadlessAgent(await request.json());
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
