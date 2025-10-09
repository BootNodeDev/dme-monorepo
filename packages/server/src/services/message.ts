import { PrismaClient } from "@prisma/client";
import ms from "ms";
import telegramify from "telegramify-markdown";
import { sanitizeEthereumAddress } from "./wallet";
import { CommandContext, Context } from "grammy";

export const LOW_PRIORITY = 0;
export const TOP_PRIORITY = 1000;

export class UsersForAddressNotFoundError extends Error {}

export type MessageOptions = {
  priority?: number;
  maxAttempts?: number;
};

export class MessageService {
  constructor(
    private prisma: PrismaClient,
    private maxAttempts: number,
  ) {}

  async create(content: string, address: string, options?: MessageOptions) {
    const walletId = sanitizeEthereumAddress(address);

    const userWallets = await this.prisma.userWallet.findMany({
      where: {
        walletId,
      },
    });

    if (userWallets.length === 0) {
      throw new UsersForAddressNotFoundError();
    }

    const userIds = userWallets.map((userWallet) => userWallet.userId);

    await this.prisma.$transaction(async (prisma) => {
      const { id: messageId } = await prisma.message.create({
        data: {
          content: telegramify(content, "remove"),
          priority: options?.priority ?? LOW_PRIORITY,
        },
      });

      await prisma.userMessage.createMany({
        data: userIds.map((userId) => {
          return {
            userId,
            messageId,
            maxAttempts: options?.maxAttempts ?? this.maxAttempts,
          };
        }),
      });
    });
  }

  async createForCtx(content: string, ctx: CommandContext<Context>, options?: MessageOptions) {
    const userId = ctx.chat.id;

    if (!userId) {
      return;
    }

    await this.prisma.$transaction(async (prisma) => {
      const { id: messageId } = await prisma.message.create({
        data: {
          content: telegramify(content, "remove"),
          priority: options?.priority ?? TOP_PRIORITY,
        },
      });

      await prisma.userMessage.create({
        data: {
          userId,
          messageId,
          maxAttempts: options?.maxAttempts ?? this.maxAttempts,
        },
      });
    });
  }

  async listSendable(take?: number) {
    const now = new Date();

    return await this.prisma.userMessage.findMany({
      where: {
        status: "PENDING",
        nextAttemptAt: {
          lte: now,
        },
      },
      orderBy: [{ message: { priority: "desc" } }, { message: { createdAt: "asc" } }],
      include: {
        message: true,
      },
      take,
    });
  }

  async updateForSend(userId: number, messageId: string) {
    const userMessage = await this.prisma.userMessage.findUniqueOrThrow({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
    });

    if (userMessage.status !== "PENDING") {
      throw new Error("Message is not pending");
    }

    if (userMessage.attempts >= userMessage.maxAttempts) {
      throw new Error("Max attempts reached");
    }

    await this.prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
      data: {
        sentAt: userMessage.sentAt ?? new Date(),
        attempts: { increment: 1 },
        status: "SENT",
      },
    });
  }

  async updateForSuccess(userId: number, messageId: string) {
    const userMessage = await this.prisma.userMessage.findUniqueOrThrow({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
    });

    if (userMessage.status !== "SENT") {
      throw new Error("Message is not sent");
    }

    await this.prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });
  }

  async updateForFailure(userId: number, messageId: string, error: string) {
    const userMessage = await this.prisma.userMessage.findUniqueOrThrow({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
    });

    if (userMessage.status !== "SENT") {
      throw new Error("Message is not sent");
    }

    const backoff = Math.min(Math.pow(2, userMessage.attempts) * ms("5s"), ms("160s"));
    const backofWithJitter = backoff + Math.trunc(Math.random() * backoff * 0.1);

    await this.prisma.userMessage.update({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
      data:
        userMessage.attempts < userMessage.maxAttempts
          ? {
              status: "PENDING",
              nextAttemptAt: new Date(Date.now() + backofWithJitter),
            }
          : {
              status: "FAILED",
              error,
            },
    });
  }
}
