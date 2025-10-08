import { Bot } from "grammy";
import { PrismaClient } from "@prisma/client";
import pino from "pino";
import { getStartHandler } from "./handlers/start";
import { getAddHandler } from "./handlers/add";
import { getListHandler } from "./handlers/list";
import { getRemoveHandler } from "./handlers/remove";
import { getFallbackHandler } from "./handlers/fallback";
import { UserService } from "./services/user";
import { WalletService } from "./services/wallet";
import { DispatchJob } from "./jobs/dispatch";
import { MessageService } from "./services/message";
import { getEnv } from "./env";
import { getLimiter, getReplyFn } from "./limiter";

const env = getEnv();
const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
const logger = pino();
const limiter = getLimiter(env.LIMITER_INTERVAL, env.LIMITER_INTERVAL_CAP);
const reply = getReplyFn(limiter);

/* Services */

const user = new UserService(prisma);
const wallet = new WalletService(prisma);
const message = new MessageService(prisma);

/* Telegram Bot */

const bot = new Bot(env.BOT_TOKEN);
bot.command("start", getStartHandler(logger.child({ handler: "start" }), reply, user, wallet));
bot.command("add", getAddHandler(logger.child({ handler: "add" }), reply, user, wallet));
bot.command("list", getListHandler(logger.child({ handler: "list" }), reply, user));
bot.command("remove", getRemoveHandler(logger.child({ handler: "remove" }), reply, user));
bot.on("message", getFallbackHandler(logger.child({ handler: "fallback" }), reply));
bot.start().catch((error) => logger.error({ error }, "Unhandled bot error"));

logger.info("Bot started");

/* Jobs */

new DispatchJob(
  logger.child({ job: "dispatch" }),
  message,
  "*/30 * * * * *", // Every 30 seconds
  bot.api.sendMessage.bind(bot.api),
).start();
