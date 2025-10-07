import { Bot } from "grammy";
import { PrismaClient } from "@prisma/client";
import pino from "pino";
import { getStartHandler } from "./handlers/start";
import { getAddHandler } from "./handlers/add";
import { getListHandler } from "./handlers/list";
import { getRemoveHandler } from "./handlers/remove";
import { UserService } from "./services/user";
import { WalletService } from "./services/wallet";
import { DispatchJob } from "./jobs/dispatch";
import { MessageService } from "./services/message";
import { getEnv } from "./config/env";

const env = getEnv();
const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
const logger = pino();

/* Services */

const user = new UserService(prisma);
const wallet = new WalletService(prisma);
const message = new MessageService(prisma);

/* Telegram Bot */

const bot = new Bot(env.BOT_TOKEN);
bot.command("start", getStartHandler(logger.child({ command: "start" }), user, wallet));
bot.command("add", getAddHandler(logger.child({ command: "add" }), user, wallet));
bot.command("list", getListHandler(logger.child({ command: "list" }), user));
bot.command("remove", getRemoveHandler(logger.child({ command: "remove" }), user));
bot.start().catch((error) => logger.error({ error }, "Unhandled bot error"));

logger.info("Bot started");

/* Jobs */

new DispatchJob(
  logger.child({ job: "dispatch" }),
  message,
  "*/30 * * * * *", // Every 30 seconds
  bot.api.sendMessage.bind(bot.api),
).start();
