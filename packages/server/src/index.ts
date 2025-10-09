import { Bot, Context, session, SessionFlavor } from "grammy";
import { run, sequentialize } from "@grammyjs/runner";
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
import { getEnv } from "./env";
import { Limiter } from "./limiter";

const env = getEnv();
const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
const logger = pino();
const bot = new Bot<Context & SessionFlavor<unknown>>(env.BOT_TOKEN);
const limiter = new Limiter(
  logger.child({ component: "limiter" }),
  env.LIMITER_INTERVAL,
  env.LIMITER_INTERVAL_CAP,
  bot,
);

/* Services */

const user = new UserService(prisma);
const wallet = new WalletService(prisma);
const message = new MessageService(prisma, env.MAX_ATTEMPTS);

/* Handlers */

const start = getStartHandler(logger.child({ handler: "start" }), message, user, wallet);
const add = getAddHandler(logger.child({ handler: "add" }), limiter, user, wallet);
const list = getListHandler(logger.child({ handler: "list" }), limiter, user);
const remove = getRemoveHandler(logger.child({ handler: "remove" }), limiter, user);

/* Telegram Bot */

const getSessionKey = (ctx: Context) => ctx.chat?.id.toString();
bot.use(sequentialize(getSessionKey));
bot.use(session({ getSessionKey }));

bot.command("start", start);
bot.command("add", add);
bot.command("list", list);
bot.command("remove", remove);

bot.catch((error) =>
  logger.error(
    { error: error.error, userId: error.ctx.from?.id, message: error.ctx.message?.text },
    "Bot error",
  ),
);

run(bot);

logger.info("Bot started");

/* Jobs */

new DispatchJob(
  logger.child({ job: "dispatch" }),
  message,
  env.DISPATCH_CRON,
  bot,
  env.MESSAGES_PER_DISPATCH,
).start();
