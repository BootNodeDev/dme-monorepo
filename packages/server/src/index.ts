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
import { Env, getEnv } from "./env";
import { SampleJob } from "./jobs/sample";
import { CleanupJob } from "./jobs/cleanup";

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

  return {
    message,
    user,
    wallet,
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

  const { message, user, wallet } = services;

  // Command used to onboard a new user and optionally subscribe a wallet
  bot.command("start", getStartHandler(logger.child({ command: "start" }), message, user, wallet));

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

  // Sample job for demo purposes
  // Can be removed or modified as needed
  const sampleJob = new SampleJob(
    logger.child({ job: "sample" }),
    services.message,
    "*/10 * * * * *", // Every 10 seconds
    services.wallet,
  );

  return [dispatchJob, cleanupJob, sampleJob];
}

main().catch((err) => {
  logger.error({ err }, "Main function failed");
  process.exit(1);
});
