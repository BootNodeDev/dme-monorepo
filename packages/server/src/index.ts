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
import { PositionService } from "./services/position";
import { OutOfRangeJob } from "./jobs/outOfRange";
import { UncollectedFeesJob } from "./jobs/uncolletedFees";
import { CleanupJob } from "./jobs/cleanup";

const env = getEnv();
const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
const logger = pino();
const bot = new Bot<Context & SessionFlavor<unknown>>(env.BOT_TOKEN);

/* Services */

const user = new UserService(prisma);
const wallet = new WalletService(prisma);
const message = new MessageService(prisma, env.MAX_ATTEMPTS);
const position = new PositionService();

/* Handlers */

const start = getStartHandler(logger.child({ handler: "start" }), message, user, wallet, position);
const add = getAddHandler(logger.child({ handler: "add" }), message, user, wallet);
const list = getListHandler(logger.child({ handler: "list" }), message, user);
const remove = getRemoveHandler(logger.child({ handler: "remove" }), message, user);

/* Telegram Bot */

const getSessionKey = (ctx: Context) => ctx.chat?.id.toString();
bot.use(sequentialize(getSessionKey));
bot.use(session({ getSessionKey }));

bot.command("start", start);
bot.command("add", add);
bot.command("list", list);
bot.command("remove", remove);

bot.catch((err) =>
  logger.error({ err, userId: err.ctx.from?.id, message: err.ctx.message?.text }, "Failure"),
);

run(bot);

logger.info("Started");

/* Jobs */

new DispatchJob(
  logger.child({ job: "dispatch" }),
  message,
  env.DISPATCH_CRON,
  bot,
  env.MESSAGES_PER_DISPATCH,
).start();

new CleanupJob(
  logger.child({ job: "cleanup" }),
  message,
  env.CLEANUP_CRON,
  env.CLEANUP_CUTOFF,
).start();

new OutOfRangeJob(
  logger.child({ job: "outOfRange" }),
  message,
  env.OUT_OF_RANGE_CRON,
  wallet,
  position,
).start();

new UncollectedFeesJob(
  logger.child({ job: "uncollectedFees" }),
  message,
  env.UNCOLLECTED_FEES_CRON,
  wallet,
  position,
).start();
