const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim();
const localWebhook =
  process.env.TELEGRAM_LOCAL_WEBHOOK_URL?.trim() ||
  "http://127.0.0.1:3000/api/webhooks/telegram";

if (!token || !webhookSecret) {
  process.stderr.write(
    "TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET_TOKEN are required.\n"
  );
  process.exit(1);
}

async function telegram(method, payload = {}) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(
      `Telegram ${method} failed: ${result.description || response.statusText}`
    );
  }
  return result.result;
}

async function forwardUpdate(update) {
  const response = await fetch(localWebhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": webhookSecret,
    },
    body: JSON.stringify(update),
  });
  if (!response.ok) {
    throw new Error(`Local webhook returned ${response.status}.`);
  }
}

await telegram("deleteWebhook", { drop_pending_updates: false });
const bot = await telegram("getMe");
process.stdout.write(
  `Telegram polling connected as @${bot.username}. Forwarding to ${localWebhook}\n`
);

let offset = 0;
while (true) {
  try {
    const updates = await telegram("getUpdates", {
      offset,
      timeout: 25,
      allowed_updates: ["message", "callback_query"],
    });
    for (const update of updates) {
      await forwardUpdate(update);
      offset = update.update_id + 1;
    }
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Telegram polling failed."}\n`
    );
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
}
