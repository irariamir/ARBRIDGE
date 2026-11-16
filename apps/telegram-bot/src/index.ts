import { Bot } from 'grammy';
import { unavailableCommandReplies } from './messages.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not configured. The bot remains stopped; see .env.example.');
  process.exit(1);
}
const bot = new Bot(token);

bot.command('start', async (ctx) => ctx.reply('Welcome to ARBRIDGE by ARIAMIR. This bot integration is under development. Account pairing and file delivery are not enabled yet. Use /help for available prototype commands.'));
bot.command('help', async (ctx) => ctx.reply([
  'ARBRIDGE commands',
  '/start — Start this bot',
  '/help — Show this message',
  '/library — Check library availability',
  '/search — Search availability',
  '/settings — Account settings availability',
  '/account — Pairing status availability',
  '/status — Processing status availability',
  '/delete — Deletion availability',
  '',
  'This prototype does not yet store documents, pair accounts, or process files.'
].join('\n')));
for (const [command, unavailable] of Object.entries(unavailableCommandReplies)) {
  bot.command(command, (ctx) => ctx.reply(unavailable));
}
bot.on('message:document', (ctx) => ctx.reply('This prototype cannot store incoming documents yet. Please do not send sensitive files.'));
bot.on('message:text', (ctx) => {
  if (/^https?:\/\//i.test(ctx.message.text)) return ctx.reply('Link intake from Telegram is not implemented yet. Public links can be submitted using the development Chrome extension.');
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
