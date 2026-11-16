import { Bot, Context, InlineKeyboard } from 'grammy';
import { unavailableCommandReplies } from './messages.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not configured. The bot remains stopped; see .env.example.');
  process.exit(1);
}
const bot = new Bot(token);
const apiBase = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const internalSecret = process.env.INTERNAL_API_SECRET ?? '';

async function api<T>(path: string, options: { method?: string; body?: unknown; internal?: boolean } = {}): Promise<T> {
  if (options.internal && internalSecret.length < 32) throw new Error('The API-to-bot internal secret is not configured.');
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method ?? 'GET',
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.internal ? { 'x-internal-secret': internalSecret } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(10_000)
  });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `API request failed (${response.status}).`);
  return data;
}
function isPrivate(ctx: Context) { return ctx.chat?.type === 'private' && Boolean(ctx.from); }
function userHelp() {
  return [
    'ARBRIDGE by ARIAMIR',
    '/start — Start and connect your account',
    '/connect 123456 — Complete a connection started in the Chrome extension',
    '/subscribe — View sample plans and request payment review',
    '/status — Check subscription and recent delivery status',
    '/library — Show recently delivered documents',
    '/account — Pairing and account help',
    '/settings — Current account settings',
    '/help — Show this message',
    '',
    'AI summaries, semantic search, and document deletion are not available in this preview.'
  ].join('\n');
}

bot.command('start', async (ctx) => {
  if (!isPrivate(ctx)) return ctx.reply('Open ARBRIDGE in a private chat to connect your account.');
  const keyboard = new InlineKeyboard().text('View plans', 'show:plans').row().text('Connect Chrome', 'show:connect').row().text('Help', 'show:help');
  await ctx.reply('Welcome to ARBRIDGE by ARIAMIR. Connect your Chrome extension, choose a plan, and send public document links to this Telegram chat.\n\nThis preview uses manual payment review when the operator has configured it. Example prices are shown in /subscribe.', { reply_markup: keyboard });
});
bot.command('help', (ctx) => ctx.reply(userHelp()));
bot.command('connect', async (ctx) => {
  const telegramUserId = ctx.from?.id; const chatId = ctx.chat?.id;
  if (ctx.chat?.type !== 'private' || !telegramUserId || !chatId) return ctx.reply('For safety, account pairing is only available in a private chat with this bot.');
  const code = String(ctx.match ?? '').trim();
  if (!/^\d{6}$/.test(code)) return ctx.reply('In the Chrome extension, choose Connect Telegram and then send the displayed code as /connect 123456.');
  try {
    const result = await api<{ confirmationCode: string; expiresAt: string }>('/internal/pairings/consume', { method: 'POST', internal: true, body: { code, telegramUserId, chatId } });
    await ctx.reply(`Confirm this connection in the Chrome extension.\n\nYour one-time confirmation code: ${result.confirmationCode}\n\nEnter it only in your ARBRIDGE extension. It expires in five minutes.`);
  } catch { await ctx.reply('That connection code is invalid, expired, or already used. Start a new connection from the extension.'); }
});

async function showPlans(ctx: Context) {
  if (!isPrivate(ctx)) return ctx.reply('For account safety, plans are shown in a private chat with this bot.');
  const config = await api<{ plans: Array<{ id: string; name: string; price: string; interval: string; summary: string }>; paymentAvailable: boolean }>('/v1/plans');
  const keyboard = new InlineKeyboard();
  for (const plan of config.plans) keyboard.text(`${plan.name} · ${plan.price}/${plan.interval}`, `plan:${plan.id}`).row();
  await ctx.reply([
    'ARBRIDGE subscription examples',
    ...config.plans.map((plan) => `• ${plan.name}: ${plan.price} per ${plan.interval} — example pricing, not a live offer`),
    '',
    config.paymentAvailable
      ? 'Choose a plan to receive the operator-configured payment instructions. Upload a transfer receipt here; an authorized reviewer must approve it before access is enabled.'
      : 'Payments are disabled until the operator securely configures a payment method, bot token, private review group, and authorized reviewers. Do not transfer money based on these sample prices.'
  ].join('\n'), { reply_markup: config.paymentAvailable ? keyboard : undefined });
}
bot.command('subscribe', async (ctx) => {
  if (!isPrivate(ctx)) return ctx.reply('Subscription requests are handled in a private chat.');
  try { await showPlans(ctx); } catch { await ctx.reply('Plans are temporarily unavailable. Please try again later.'); }
});

bot.callbackQuery('show:plans', async (ctx) => {
  await ctx.answerCallbackQuery();
  try { await showPlans(ctx); } catch { await ctx.reply('Plans are temporarily unavailable. Please try again later.'); }
});
bot.callbackQuery('show:connect', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('In the Chrome extension choose “Connect Telegram”. Copy its short-lived code, then send it here with /connect followed by the code. I will return a second code for the extension.');
});
bot.callbackQuery('show:help', async (ctx) => { await ctx.answerCallbackQuery(); await ctx.reply(userHelp()); });

bot.callbackQuery(/^plan:(monthly|annual)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramUserId = ctx.from?.id; const chatId = ctx.chat?.id;
  if (ctx.chat?.type !== 'private' || !telegramUserId || !chatId) return ctx.reply('Choose a plan in a private chat with this bot.');
  const planId = ctx.match[1]!;
  try {
    const result = await api<{ receipt: { id: string; status: string }; plan: { name: string; price: string; interval: string }; paymentInstructions: string }>('/internal/receipts', {
      method: 'POST', internal: true, body: { telegramUserId, chatId, planId }
    });
    await ctx.reply(`Selected: ${result.plan.name} · ${result.plan.price} per ${result.plan.interval}\n\n${result.paymentInstructions}\n\nAfter completing a transfer, send a clear photo or PDF receipt in this chat. Access starts only after an authorized reviewer confirms it. Receipt reviews are manual; do not send card numbers, passwords, or one-time bank codes.`);
  } catch (error) {
    const message = error instanceof Error && error.message === 'PAYMENTS_NOT_CONFIGURED'
      ? 'Payments are not configured yet. No payment request was created; do not transfer money. Please contact the operator.'
      : 'This plan could not be requested. It may be invalid or another receipt may already be awaiting review.';
    await ctx.reply(message);
  }
});

async function submitProof(ctx: Context, fileName: string) {
  const from = ctx.from; const chat = ctx.chat; const message = ctx.message;
  if (chat?.type !== 'private' || !from || !message) return ctx.reply('Send payment proof to the bot in a private chat.')
  const reviewChatId = process.env.TELEGRAM_REVIEW_CHAT_ID;
  if (!reviewChatId) return ctx.reply('The payment review group is not configured. Your proof was not forwarded.');
  try {
    const open = await api<{ receipt: { id: string }; plan: { name: string; price: string; interval: string } }>(`/internal/receipts/open/${from.id}`, { internal: true });
    const copied = await ctx.api.copyMessage(reviewChatId, chat.id, message.message_id);
    const receiptId = open.receipt.id;
    const keyboard = new InlineKeyboard().text('Approve', `receipt:approve:${receiptId}`).text('Reject', `receipt:reject:${receiptId}`);
    const reviewMessage = await ctx.api.sendMessage(reviewChatId,
      `ARBRIDGE payment proof · PENDING REVIEW\nReceipt: ${receiptId}\nTelegram user ID: ${from.id}\nPlan: ${open.plan.name} · ${open.plan.price}/${open.plan.interval}\nFile: ${fileName.slice(0, 160)}\nProof message: ${copied.message_id}`,
      { reply_markup: keyboard }
    );
    await api(`/internal/receipts/${receiptId}/proof`, { method: 'POST', internal: true, body: { telegramUserId: from.id, fileName } });
    await ctx.reply('Receipt received and forwarded to the private review group. Your subscription remains inactive until an authorized reviewer approves it.');
    console.info('Payment proof forwarded for review.', { receiptId, reviewMessageId: reviewMessage.message_id });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('No payment proof')
      ? 'There is no payment request awaiting a receipt. Use /subscribe first.'
      : 'The proof could not be submitted. Check that the private review group is configured and try again.';
    await ctx.reply(message);
  }
}
bot.on('message:photo', async (ctx) => {
  const photo = ctx.message.photo.at(-1);
  if (photo) await submitProof(ctx, `photo (${photo.width}×${photo.height})`);
});
bot.on('message:document', async (ctx) => {
  const document = ctx.message.document;
  if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(document.mime_type ?? '')) return ctx.reply('For a payment receipt, send a PDF, JPEG, PNG, or WebP file.');
  await submitProof(ctx, document.file_name || `document (${document.mime_type ?? 'unknown type'})`);
});

bot.callbackQuery(/^receipt:(approve|reject):([0-9a-f-]{36})$/, async (ctx) => {
  const action = ctx.match[1] as 'approve' | 'reject';
  const receiptId = ctx.match[2]!;
  try {
    await api(`/internal/receipts/${receiptId}/review`, { method: 'POST', internal: true, body: { action, reviewerId: ctx.from.id } });
    await ctx.answerCallbackQuery({ text: action === 'approve' ? 'Approved; subscription updated.' : 'Rejected; user notified.' });
    if (ctx.callbackQuery.message) await ctx.api.editMessageReplyMarkup(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id, { reply_markup: new InlineKeyboard() });
  } catch {
    await ctx.answerCallbackQuery({ text: 'Review denied or this receipt was already handled.', show_alert: true });
  }
});

bot.command('status', async (ctx) => {
  if (!ctx.from) return;
  try {
    const result = await api<{ active: boolean; subscription: { planId: string; expiresAt: string } | null }>(`/internal/subscriptions/${ctx.from.id}`, { internal: true });
    const subscription = result.active && result.subscription
      ? `Subscription: active (${result.subscription.planId}) until ${new Date(result.subscription.expiresAt).toLocaleDateString('en-US')}.`
      : 'Subscription: inactive. Use /subscribe to see example plans and configured payment options.';
    await ctx.reply(`${subscription}\nDocument delivery: ${result.active ? 'available for connected accounts' : 'subscription required'}.`);
  } catch { await ctx.reply('Subscription status is temporarily unavailable.'); }
});
bot.command('library', async (ctx) => {
  if (!ctx.from) return;
  try {
    const result = await api<{ documents: Array<{ title: string; sourceHost: string; fileType?: string; createdAt: string }> }>(`/internal/library/${ctx.from.id}`, { internal: true });
    await ctx.reply(result.documents.length ? ['Recently delivered documents:', ...result.documents.map((doc) => `• ${doc.title} — ${doc.fileType ?? 'file'} · ${doc.sourceHost}`)].join('\n') : 'No files have been delivered in this preview yet.');
  } catch { await ctx.reply('The library is temporarily unavailable.'); }
});
bot.command('account', (ctx) => ctx.reply('Connect from the Chrome extension. It will show a one-time command for this bot; send it with /connect, then enter the confirmation code I send back into the extension.'));
bot.command('settings', (ctx) => ctx.reply('Account settings are available from the browser extension after pairing. Use /status to check access and /help for commands.'));
bot.command('search', (ctx) => ctx.reply(unavailableCommandReplies.search));
bot.command('delete', (ctx) => ctx.reply(unavailableCommandReplies.delete));
bot.command('cancel', async (ctx) => {
  if (!ctx.from) return;
  await ctx.reply('No payment or pairing request was cancelled. Pending requests expire automatically; ask an authorized reviewer to reject an uploaded receipt.');
});
bot.on('message:text', async (ctx) => {
  if (/^https?:\/\//i.test(ctx.message.text)) return ctx.reply('To send a public document link, use the ARBRIDGE Chrome extension. Protected links may not be accessible to the server.');
});
bot.catch((error) => console.error('Telegram update failed:', error.error instanceof Error ? error.error.message : 'unknown error'));

try {
  const me = await bot.api.getMe();
  console.info(`ARBRIDGE bot configured as @${me.username}; polling started.`);
  await bot.start({ onStart: () => console.info('Telegram long polling started.') });
} catch (error) {
  console.error('Telegram bot could not start. Check its configuration and network access.');
  console.error(error instanceof Error ? error.message : 'Unknown Telegram API error.');
  process.exit(1);
}
