import { Bot } from "grammy";

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  throw new Error("BOT_TOKEN environment variable is not set");
}

const bot = new Bot(botToken);

bot.command("start", (ctx) => ctx.reply("Hello, world!"));

bot.start();
