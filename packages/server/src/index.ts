import { Bot } from "grammy";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const EthereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const prisma = new PrismaClient();

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  throw new Error("BOT_TOKEN environment variable is not set");
}

const bot = new Bot(botToken);

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;

  if (!userId) {
    ctx.reply("Something went wrong. Please try again later.");
    return;
  }

  let alreadyExists = false;

  try {
    await prisma.user.create({ data: { id: userId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      alreadyExists = true;
    } else {
      ctx.reply("Something went wrong. Please try again later.");
      return;
    }
  }

  const address = ctx.message?.text.split(" ")[1];

  let walletAlreadySubscribed = false;

  if (address) {
    try {
      EthereumAddressSchema.parse(address);
    } catch {
      ctx.reply("Invalid wallet address. Please try again.");
      return;
    }

    const walletId = address.toLowerCase();

    await prisma.wallet.upsert({
      where: { id: walletId },
      update: {},
      create: { id: walletId },
    });

    try {
      await prisma.usersWallets.create({ data: { userId, walletId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        walletAlreadySubscribed = true;
      }
    }
  }

  const reply: string[] = [];

  reply.push(alreadyExists ? "Welcome back!" : "Welcome!");

  if (address && !walletAlreadySubscribed) {
    reply.push(`You have successfully subscribed the wallet: ${address}`);
  }

  ctx.reply(reply.join("\n"));
});

bot.start();
