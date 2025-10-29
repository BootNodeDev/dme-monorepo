import { Message, PrismaClient, UserMessage as PrismaUserMessage } from "@prisma/client";
import ms from "ms";
import telegramify from "telegramify-markdown";
import { sanitizeEthereumAddress } from "./wallet";

export const LOW_PRIORITY = 0;
export const TOP_PRIORITY = 1000;

export class UsersForAddressNotFoundError extends Error {}

export type MessageOptions = { priority?: number; maxAttempts?: number };

export type UserMessage = PrismaUserMessage & { message: Message };

export type UserMessageId = { userId: number; messageId: string };

export type UserMessageIdWithError = UserMessageId & { error: string };

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

  async createForUser(content: string, userId: number, options?: MessageOptions) {
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

  async listSendable(take?: number): Promise<UserMessage[]> {
    const now = new Date();

    return await this.prisma.userMessage.findMany({
      where: {
        status: "PENDING",
        nextAttemptAt: {
          lte: now,
        },
      },
      orderBy: [
        {
          message: {
            priority: "desc",
          },
        },
        {
          message: {
            createdAt: "asc",
          },
        },
      ],
      include: {
        message: true,
      },
      take,
      distinct: "userId",
    });
  }

  async deleteBefore(date: Date) {
    return await this.prisma.message.deleteMany({
      where: {
        createdAt: {
          lt: date,
        },
      },
    });
  }

  async updateForSend(ids: UserMessageId[]) {
    const cleanIds = ids.map(({ userId, messageId }) => ({ userId, messageId }));

    const dbUserMessages = await this.prisma.userMessage.findMany({
      where: {
        OR: cleanIds,
      },
    });

    await this.prisma.$transaction(
      dbUserMessages.map(({ userId, messageId, sentAt }) =>
        this.prisma.userMessage.update({
          where: {
            userId_messageId: {
              userId,
              messageId,
            },
          },
          data: {
            sentAt: sentAt ?? new Date(),
            status: "SENT",
            attempts: {
              increment: 1,
            },
          },
        }),
      ),
    );
  }

  async updateForSuccess(ids: UserMessageId[]) {
    const cleanIds = ids.map(({ userId, messageId }) => ({ userId, messageId }));

    await this.prisma.userMessage.updateMany({
      where: {
        OR: cleanIds,
      },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });
  }

  async updateForFailure(ids: UserMessageIdWithError[]) {
    const cleanIds = ids.map(({ userId, messageId }) => ({ userId, messageId }));

    const dbUserMessages = await this.prisma.userMessage.findMany({ where: { OR: cleanIds } });

    const errorsById = new Map<string, string>(
      ids.map(({ userId, messageId, error }) => [`${userId}:${messageId}`, error]),
    );

    await this.prisma.$transaction(
      dbUserMessages.map(({ userId, messageId, maxAttempts, attempts }) => {
        const error = errorsById.get(`${userId}:${messageId}`)!;
        const backoff = Math.min(Math.pow(2, attempts) * ms("5s"), ms("160s"));
        const backoffWithJitter = backoff + Math.trunc(Math.random() * backoff * 0.1);

        return this.prisma.userMessage.update({
          where: {
            userId_messageId: {
              userId,
              messageId,
            },
          },
          data:
            attempts < maxAttempts
              ? {
                  status: "PENDING",
                  error,
                  nextAttemptAt: new Date(Date.now() + backoffWithJitter),
                }
              : {
                  status: "FAILED",
                  error,
                },
        });
      }),
    );
  }
}
