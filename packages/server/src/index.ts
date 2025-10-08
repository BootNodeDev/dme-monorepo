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
import { Limiter } from "./limiter";

const env = getEnv();
const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
const logger = pino();
const bot = new Bot(env.BOT_TOKEN);
const limiter = new Limiter(
  logger.child({ component: "limiter" }),
  env.LIMITER_INTERVAL,
  env.LIMITER_INTERVAL_CAP,
  bot,
);

/* Services */

const user = new UserService(prisma);
const wallet = new WalletService(prisma);
const message = new MessageService(prisma);

/* Handlers */

const start = getStartHandler(logger.child({ handler: "start" }), limiter, user, wallet);
const add = getAddHandler(logger.child({ handler: "add" }), limiter, user, wallet);
const list = getListHandler(logger.child({ handler: "list" }), limiter, user);
const remove = getRemoveHandler(logger.child({ handler: "remove" }), limiter, user);
const fallback = getFallbackHandler(logger.child({ handler: "fallback" }), limiter);

/* Telegram Bot */

bot.command("start", start);
bot.command("add", add);
bot.command("list", list);
bot.command("remove", remove);
bot.on("message", fallback);
bot.start().catch((error) => logger.error({ error }, "Unhandled bot error"));

logger.info("Bot started");

/* Jobs */

new DispatchJob(
  logger.child({ job: "dispatch" }),
  message,
  "*/30 * * * * *", // Every 30 seconds
  limiter,
).start();

async function main() {
  const userWallet = await prisma.userWallet.findFirst();

  for (let i = 0; i < 50; i++) {
    await message.create("hola 1" + i, userWallet!.walletId);
  }

  await new Promise((resolve) => setTimeout(resolve, 40000));

  for (let i = 0; i < 50; i++) {
    await message.create("hola 2" + i, userWallet!.walletId);
  }
}

main();
