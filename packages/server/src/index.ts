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
import { PositionService } from "./services/position";
import { OutOfRangeJob } from "./jobs/outOfRange";
import { UncollectedFeesJob } from "./jobs/uncolletedFees";
import { Env, getEnv } from "./env";
import { CleanupJob } from "./jobs/cleanup";
import { SummaryJob } from "./jobs/summary";

const logger = pino();

/**
 * Main function to instantiate and run all components of the application
 */
async function main() {
  const env = getEnv();
  const prisma = await getPrismaClient(env);
  const services = getServices(prisma, env);
  const bot = getBot(env, services);
  const jobs = getJobs(env, services, bot);

  run(bot);

  jobs.forEach((job) => job.start());
}

/**
 * Instantiate and configure the Prisma Client for database interactions
 */
async function getPrismaClient(env: Env): Promise<PrismaClient> {
  const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });

  // SQlite Database optimizations.
  // Remove or change for other databases
  await prisma.$queryRawUnsafe(`PRAGMA journal_mode=WAL;`);
  await prisma.$queryRawUnsafe(`PRAGMA synchronous=NORMAL;`);

  return prisma;
}

/**
 * Instantiate all services used across the application
 */
function getServices(prisma: PrismaClient, env: Env) {
  // Service responsible for managing messages
  const message = new MessageService(prisma, env.MAX_ATTEMPTS);

  // Service responsible for managing users
  const user = new UserService(prisma);

  // Service responsible for managing wallets
  const wallet = new WalletService(prisma);

  // Service responsible for requesting positions from revert.finance
  const position = new PositionService();

  return {
    message,
    user,
    wallet,
    position,
  };
}

/**
 * Instantiate and configure the Telegram Bot with all commands and middleware
 */
function getBot(env: Env, services: ReturnType<typeof getServices>) {
  const bot = new Bot<Context & SessionFlavor<unknown>>(env.BOT_TOKEN);

  // Middleware that ensures order of message processing per user
  const getSessionKey = (ctx: Context) => ctx.chat?.id.toString();
  bot.use(sequentialize(getSessionKey));
  bot.use(session({ getSessionKey }));

  const { message, user, wallet, position } = services;

  // Command used to onboard a new user and optionally subscribe a wallet
  bot.command("start", getStartHandler(logger.child({ command: "start" }), message, user, wallet, position));

  // Command used to subscribe a new wallet
  bot.command("add", getAddHandler(logger.child({ command: "add" }), message, user, wallet));

  // Command used to list all subscribed wallets
  bot.command("list", getListHandler(logger.child({ command: "list" }), message, user));

  // Command used to unsubscribe a wallet
  bot.command("remove", getRemoveHandler(logger.child({ command: "remove" }), message, user));

  // Global error handler for the bot
  bot.catch((err) =>
    logger.error({ err, userId: err.ctx.from?.id, message: err.ctx.message?.text }, "Failure"),
  );

  return bot;
}

/**
 * Instantiate all jobs for scheduled background processing
 */
function getJobs(
  env: Env,
  services: ReturnType<typeof getServices>,
  bot: ReturnType<typeof getBot>,
) {
  // Job that dispatches queued messages to users
  const dispatchJob = new DispatchJob(
    logger.child({ job: "dispatch" }),
    services.message,
    env.DISPATCH_CRON,
    bot,
    env.MESSAGES_PER_DISPATCH,
  );

  // Job that deletes old messages from the database
  const cleanupJob = new CleanupJob(
    logger.child({ job: "cleanup" }),
    services.message,
    env.CLEANUP_CRON,
    env.CLEANUP_CUTOFF,
  );

  // Job that sends notifications when a position is out of range
  const outOfRangeJob = new OutOfRangeJob(
    logger.child({ job: "outOfRange" }),
    services.message,
    env.OUT_OF_RANGE_CRON,
    services.wallet,
    services.position,
  );

  // Job that sends notifications when a position has uncollected fees
  const uncollectedFeesJob = new UncollectedFeesJob(
    logger.child({ job: "uncollectedFees" }),
    services.message,
    env.UNCOLLECTED_FEES_CRON,
    services.wallet,
    services.position,
  );

  // Job that sends a summary of the user's positions
  const summaryJob = new SummaryJob(
    logger.child({ job: "summary" }),
    services.message,
    env.SUMMARY_CRON,
    services.wallet,
    services.position,
  );

  return [dispatchJob, cleanupJob, outOfRangeJob, uncollectedFeesJob, summaryJob];
}

main().catch((err) => {
  logger.error({ err }, "Main function failed");
  process.exit(1);
});
