import { Bot, Context, InlineKeyboard } from 'grammy';
import { formatTransferStatus } from './messages.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not configured. The bot remains stopped; see .env.example.');
  process.exit(1);
}
const bot = new Bot(token);
const apiBase = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const internalSecret = process.env.INTERNAL_API_SECRET ?? '';

async function api<T>(path: string, options: { method?: string; body?: unknown; internal?: boolean } = {}): Promise<T> {
  if (options.internal && internalSecret.length < 32) throw new Error('INTERNAL_API_SECRET must contain at least 32 characters.');
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
    '/start — Start the bot',
    '/connect 123456 — Connect this Telegram chat to the Chrome extension',
    '/status — Show recent file transfers',
    '/library — Show successfully delivered files',
    '/help — Show this message',
    '',
    'Send public HTTPS document links from the ARBRIDGE Chrome extension. Files are downloaded by the API and sent to this private chat.'
  ].join('\n');
}

bot.command('start', async (ctx) => {
  if (!isPrivate(ctx)) return ctx.reply('Open ARBRIDGE in a private chat to connect your account.');
  const keyboard = new InlineKeyboard().text('Connect Chrome', 'show:connect').row().text('Help', 'show:help');
  await ctx.reply('Welcome to ARBRIDGE by ARIAMIR. Connect this Telegram chat to the Chrome extension, then send public document links to receive files here. No subscription or payment is required in this test version.', { reply_markup: keyboard });
});
bot.command('help', (ctx) => ctx.reply(userHelp()));
bot.command('connect', async (ctx) => {
  const telegramUserId = ctx.from?.id; const chatId = ctx.chat?.id;
  if (ctx.chat?.type !== 'private' || !telegramUserId || !chatId) return ctx.reply('For safety, account pairing is only available in a private chat with this bot.');
  const code = String(ctx.match ?? '').trim();
  if (!/^\d{6}$/.test(code)) return ctx.reply('In the Chrome extension, choose Connect Telegram and then send the displayed code as /connect 123456.');
  try {
    const result = await api<{ confirmationCode: string }>('/internal/pairings/consume', { method: 'POST', internal: true, body: { code, telegramUserId, chatId } });
    await ctx.reply(`Confirm this connection in the Chrome extension.\n\nYour one-time confirmation code: ${result.confirmationCode}\n\nEnter it only in your ARBRIDGE extension. It expires in five minutes.`);
  } catch { await ctx.reply('That connection code is invalid, expired, or already used. Start a new connection from the extension.'); }
});
bot.callbackQuery('show:connect', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('In the Chrome extension choose “Connect Telegram”. Copy its short-lived code, then send it here with /connect followed by the code. I will return a second code for the extension.');
});
bot.callbackQuery('show:help', async (ctx) => { await ctx.answerCallbackQuery(); await ctx.reply(userHelp()); });

bot.command('status', async (ctx) => {
  if (!ctx.from) return;
  try {
    const result = await api<{ documents: Array<{ title: string; sourceHost: string; fileType?: string }> }>(`/internal/library/${ctx.from.id}`, { internal: true });
    await ctx.reply(result.documents.length
      ? ['Recent delivered files:', ...result.documents.map((doc) => formatTransferStatus(doc))].join('\n')
      : 'No files have been delivered yet. Send a public file link from the Chrome extension to test a transfer.');
  } catch { await ctx.reply('Transfer status is temporarily unavailable.'); }
});
bot.command('library', async (ctx) => {
  if (!ctx.from) return;
  try {
    const result = await api<{ documents: Array<{ title: string; sourceHost: string; fileType?: string }> }>(`/internal/library/${ctx.from.id}`, { internal: true });
    await ctx.reply(result.documents.length
      ? ['Successfully delivered files:', ...result.documents.map((doc) => formatTransferStatus(doc))].join('\n')
      : 'Your delivered-file list is empty.');
  } catch { await ctx.reply('The file list is temporarily unavailable.'); }
});
bot.on('message:text', async (ctx) => {
  if (/^https?:\/\//i.test(ctx.message.text)) return ctx.reply('To transfer a file, open the ARBRIDGE Chrome extension and use “Send to ARBRIDGE” on a public HTTPS file link.');
});
bot.catch((error) => console.error('Telegram update failed:', error.error instanceof Error ? error.error.message : 'unknown error'));

try {
  const me = await bot.api.getMe();
  console.info(`ARBRIDGE bot configured as @${me.username}; polling started.`);
  await bot.start({ onStart: () => console.info('Telegram long polling started.') });
} catch (error) {
  console.error('Telegram bot could not start. Check its configuration and network access.');
  console.error(error instanceof Error ? error.message : 'Unknown error.');
  process.exit(1);
}
