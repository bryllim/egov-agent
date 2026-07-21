import { timingSafeEqual } from "node:crypto";

import {
  handleTelegramUpdate,
  type TelegramUpdate,
} from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim();
  const received = request.headers
    .get("x-telegram-bot-api-secret-token")
    ?.trim();
  if (!expected || !received) return false;

  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export async function GET() {
  return Response.json(
    {
      service: "eGov Agent Telegram adapter",
      configured: Boolean(
        process.env.TELEGRAM_BOT_TOKEN &&
          process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN
      ),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    await handleTelegramUpdate(update);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Telegram update failed." },
      { status: 500 }
    );
  }
}
