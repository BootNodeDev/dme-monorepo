import { Bot } from "grammy";
import { PrismaClient } from "@prisma/client";
import { getStartHandler } from "./handlers/start";
import { getAddHandler } from "./handlers/add";
import { getListHandler } from "./handlers/list";
import { getRemoveHandler } from "./handlers/remove";
import { UserService } from "./services/user";
import { WalletService } from "./services/wallet";
import { DispatchJob } from "./jobs/dispatch";
import { MessageService } from "./services/message";

const prisma = new PrismaClient();

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  throw new Error("BOT_TOKEN environment variable is not set");
}

const user = new UserService(prisma);
const wallet = new WalletService(prisma);
const message = new MessageService(prisma);

const bot = new Bot(botToken);

bot.command("start", getStartHandler(user, wallet));
bot.command("add", getAddHandler(user, wallet));
bot.command("list", getListHandler(user));
bot.command("remove", getRemoveHandler(user));

bot.start();

new DispatchJob(
  message,
  "*/30 * * * * *", // Every 30 seconds
  bot.api.sendMessage.bind(bot.api),
).start();
