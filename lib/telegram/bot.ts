import "server-only";

import type { ChatHistoryItem } from "@/app/agent/ai-contract";
import type { Card } from "@/app/agent/brain";
import {
  runHeadlessAgent,
  type HeadlessAgentResult,
} from "@/lib/agent/headless";

type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
};

type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: TelegramUser;
  message?: TelegramMessage;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type TelegramSession = {
  history: ChatHistoryItem[];
  actions: string[];
  updatedAt: number;
};

type TelegramGlobals = typeof globalThis & {
  __egovTelegramSessions?: Map<number, TelegramSession>;
  __egovTelegramUpdates?: Set<number>;
};

const telegramGlobals = globalThis as TelegramGlobals;
const sessions =
  telegramGlobals.__egovTelegramSessions ??
  (telegramGlobals.__egovTelegramSessions = new Map());
const processedUpdates =
  telegramGlobals.__egovTelegramUpdates ??
  (telegramGlobals.__egovTelegramUpdates = new Set());

const MAX_HISTORY_ITEMS = 10;
const MAX_SESSIONS = 500;
const MAX_PROCESSED_UPDATES = 1_000;
const TELEGRAM_MESSAGE_LIMIT = 4_096;

function getRequiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

async function callTelegram(
  method: string,
  payload: Record<string, unknown>
) {
  const token = getRequiredEnvironment("TELEGRAM_BOT_TOKEN");
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );
  const result = (await response.json()) as {
    ok?: boolean;
    description?: string;
  };

  if (!response.ok || !result.ok) {
    throw new Error(
      `Telegram ${method} failed: ${result.description ?? response.statusText}`
    );
  }
}

function pruneState() {
  if (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.entries()].sort(
      (left, right) => left[1].updatedAt - right[1].updatedAt
    );
    for (const [chatId] of oldest.slice(0, sessions.size - MAX_SESSIONS)) {
      sessions.delete(chatId);
    }
  }

  if (processedUpdates.size > MAX_PROCESSED_UPDATES) {
    const excess = processedUpdates.size - MAX_PROCESSED_UPDATES;
    for (const updateId of [...processedUpdates].slice(0, excess)) {
      processedUpdates.delete(updateId);
    }
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function markdownToTelegramHtml(markdown: string) {
  const escaped = escapeHtml(markdown);
  return escaped
    .replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/^\s*[-*]\s+/gm, "• ");
}

function cardLines(card: Card) {
  switch (card.kind) {
    case "appointment":
      return [
        `**${card.title}**`,
        card.subtitle,
        `Date: ${card.date}`,
        `Time: ${card.time}`,
        `Location: ${card.location}`,
        `Reference: ${card.reference}`,
      ];
    case "checklist":
      return [
        `**${card.title}**`,
        ...card.items.map((item) => `• ${item}`),
        `Fee: ${card.fee}`,
      ];
    case "contributions":
      return [
        `**${card.title}**`,
        ...card.rows.map(
          (row) => `${row.month}: ${row.amount} · ${row.status}`
        ),
        `Total: ${card.total}`,
        card.meta,
      ];
    case "record":
      return [
        `**${card.title}**`,
        ...card.fields.map((field) => `${field.label}: ${field.value}`),
        ...(card.qr ? [`${card.qr.label}: ${card.qr.value}`] : []),
      ];
    case "employmentPack":
      return [
        `**${card.title} · ${card.ready}/${card.total} ready**`,
        ...card.services.map(
          (service) =>
            `${service.agency}: ${service.service} · ${service.status}`
        ),
        ...card.vaultDocuments.map(
          (document) => `Vault: ${document.name} · ${document.status}`
        ),
      ];
    case "payment":
      return [
        `**${card.title}**`,
        `${card.agency}: ${card.service}`,
        ...card.lineItems.map((item) => `${item.label}: ${item.amount}`),
        `Total: ${card.total}`,
        `Payment method: ${card.method}`,
        `Reference: ${card.reference}`,
      ];
    case "receipt":
      return [
        `**${card.title}**`,
        `${card.agency}: ${card.service}`,
        ...card.lineItems.map((item) => `${item.label}: ${item.amount}`),
        `Total paid: ${card.total}`,
        `Receipt: ${card.receiptNumber}`,
        `Transaction: ${card.transactionNumber}`,
        `Paid: ${card.paidAt}`,
      ];
    case "ereportDraft":
      return [
        `**${card.title}**`,
        `${card.reportType} · ${card.severity}`,
        `Location: ${card.location}`,
        card.summary,
        `Evidence: ${card.evidence}`,
        ...card.responders.map(
          (responder) => `${responder.agency}: ${responder.role}`
        ),
      ];
    case "ereportConfirmation":
      return [
        `**${card.title}**`,
        `Report: ${card.reportNumber}`,
        `Incident: ${card.incident}`,
        `Location: ${card.location}`,
        `Submitted: ${card.submittedAt}`,
        `Response ETA: ${card.eta}`,
      ];
    case "ltoViolation":
      return [
        "**Official LTO violation record**",
        `Case: ${card.caseNumber}`,
        `Violation: ${card.violation}`,
        `Status: ${card.status}`,
        `Date: ${card.date} · ${card.time}`,
        `Location: ${card.location}`,
        `Fine: ${card.fine}`,
        `Note: ${card.note}`,
      ];
    case "map":
      return [
        `**${card.title}**`,
        ...card.sites.map(
          (site) =>
            `${site.recommended ? "Recommended · " : ""}${site.name}: ${site.distance} · ${site.slot}`
        ),
      ];
  }
}

function absoluteDocumentUrl(href: string) {
  if (/^https?:\/\//i.test(href)) return href;
  const baseUrl = process.env.APP_BASE_URL?.trim();
  if (!baseUrl) return null;
  return new URL(href, baseUrl).toString();
}

function formatAgentResult(result: HeadlessAgentResult) {
  const sections = [result.plan.text];

  if (result.plan.card) {
    sections.push(cardLines(result.plan.card).join("\n"));
  }

  const html = markdownToTelegramHtml(sections.join("\n\n"));
  if (result.plan.attachments?.length) {
    const links = result.plan.attachments.flatMap((attachment) => {
      const url = absoluteDocumentUrl(attachment.href);
      return url ? [`<a href="${escapeHtml(url)}">${escapeHtml(attachment.name)}</a>`] : [];
    });
    if (links.length) return `${html}\n\n${links.join("\n")}`;
  }

  return html;
}

function actionKeyboard(actions: string[]) {
  const rows = actions.slice(0, 3).map((action, index) => [
    {
      text: action,
      callback_data: `action:${index}`,
    },
  ]);
  return rows.length ? { inline_keyboard: rows } : undefined;
}

function userName(user: TelegramUser | undefined) {
  if (!user) return { firstName: "User", name: "User" };
  const firstName = user.first_name.trim().slice(0, 80) || "User";
  const name = [firstName, user.last_name?.trim()]
    .filter(Boolean)
    .join(" ")
    .slice(0, 160);
  return { firstName, name };
}

function getInput(update: TelegramUpdate) {
  if (update.message?.text) {
    return {
      chatId: update.message.chat.id,
      user: update.message.from,
      text: update.message.text.trim(),
    };
  }

  const callback = update.callback_query;
  const chatId = callback?.message?.chat.id;
  if (!callback || !chatId || !callback.data?.startsWith("action:")) {
    return null;
  }

  const actionIndex = Number(callback.data.slice("action:".length));
  const action = sessions.get(chatId)?.actions[actionIndex];
  return action
    ? {
        chatId,
        user: callback.from,
        text: action,
      }
    : null;
}

async function sendWelcome(chatId: number, firstName: string) {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `Hello, <b>${escapeHtml(firstName)}</b>. I’m your eGov Agent. Ask me about government records, applications, appointments, payments, or multi-agency services.`,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

async function processTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    await callTelegram("answerCallbackQuery", {
      callback_query_id: update.callback_query.id,
    });
  }

  const input = getInput(update);
  if (!input?.text) return;

  const identity = userName(input.user);
  if (/^\/(start|help)(?:@\w+)?(?:\s|$)/i.test(input.text)) {
    await sendWelcome(input.chatId, identity.firstName);
    return;
  }

  const previous =
    sessions.get(input.chatId) ??
    ({ history: [], actions: [], updatedAt: Date.now() } satisfies TelegramSession);

  await callTelegram("sendChatAction", {
    chat_id: input.chatId,
    action: "typing",
  });

  try {
    const result = await runHeadlessAgent({
      message: input.text,
      history: previous.history,
      user: identity,
    });
    const reply = formatAgentResult(result);
    if (reply.length > TELEGRAM_MESSAGE_LIMIT) {
      throw new Error("The generated Telegram response is too long.");
    }

    await callTelegram("sendMessage", {
      chat_id: input.chatId,
      text: reply,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(result.suggestedActions.length
        ? { reply_markup: actionKeyboard(result.suggestedActions) }
        : {}),
    });

    sessions.set(input.chatId, {
      history: [
        ...previous.history,
        { role: "user", text: input.text },
        { role: "assistant", text: result.plan.text },
      ].slice(-MAX_HISTORY_ITEMS),
      actions: result.suggestedActions,
      updatedAt: Date.now(),
    });
  } catch {
    await callTelegram("sendMessage", {
      chat_id: input.chatId,
      text: "I couldn’t complete that request right now. Please try again in a moment.",
    });
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (
    !Number.isInteger(update.update_id) ||
    processedUpdates.has(update.update_id)
  ) {
    return;
  }
  processedUpdates.add(update.update_id);
  pruneState();

  try {
    await processTelegramUpdate(update);
  } catch (error) {
    processedUpdates.delete(update.update_id);
    throw error;
  }
}
