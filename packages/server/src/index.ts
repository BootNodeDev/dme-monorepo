import { Bot } from "grammy";
import { PrismaClient, Prisma } from "@prisma/client";
import { getStartHandler } from "./handlers/start";
import { UserService } from "./services/user";
import { WalletService } from "./services/wallet";

const prisma = new PrismaClient();

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  throw new Error("BOT_TOKEN environment variable is not set");
}

const user = new UserService(prisma);
const wallet = new WalletService(prisma);
const bot = new Bot(botToken);

bot.command("start", getStartHandler(user, wallet));

bot.start();
