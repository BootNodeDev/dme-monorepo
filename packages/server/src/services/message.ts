import { Prisma, PrismaClient, UserMessageAttempt } from "@prisma/client";
import ms from "ms";
import { sanitizeEthereumAddress } from "./wallet";

export class UsersForAddressNotFoundError extends Error {}

export class MessageService {
  constructor(private prisma: PrismaClient) {}

  async create(content: string, address: string) {
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
          content,
        },
      });

      await prisma.userMessage.createMany({
        data: userIds.map((userId) => ({ messageId, userId })),
      });
    });
  }

  async listSendable() {
    const where: Prisma.UserMessageWhereInput = {
      AND: [
        {
          OR: [
            {
              attempts: { none: {} },
            },
            {
              attempts: { some: { nextAttemptAt: { lte: new Date() } } },
            },
          ],
        },
        {
          NOT: {
            attempts: {
              some: {
                attempt: {
                  gte: 3,
                },
              },
            },
          },
        },
      ],
    };

    return await this.prisma.message.findMany({
      where: {
        recipients: {
          some: where,
        },
      },
      include: {
        recipients: {
          where,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async newAttempt(messageId: string, userId: number) {
    const previous = await this.prisma.userMessageAttempt.findFirst({
      where: {
        userId,
        messageId,
      },
      orderBy: {
        attempt: "desc",
      },
    });

    return await this.prisma.userMessageAttempt.create({
      data: {
        attempt: previous ? previous.attempt + 1 : 1,
        userId,
        messageId,
      },
    });
  }

  async markAsDelivered({ userId, messageId, attempt }: UserMessageAttempt) {
    await this.prisma.userMessageAttempt.update({
      where: {
        userId_messageId_attempt: {
          messageId,
          userId,
          attempt,
        },
      },
      data: {
        deliveredAt: new Date(),
      },
    });
  }

  async markAsFailed({ userId, messageId, attempt }: UserMessageAttempt, error: string) {
    const delay = Math.min(Math.pow(2, attempt - 1) * ms('1m'), ms('1h'));
    const nextAttemptAt = new Date(Date.now() + delay);

    await this.prisma.userMessageAttempt.update({
      where: {
        userId_messageId_attempt: {
          messageId,
          userId,
          attempt,
        },
      },
      data: {
        error,
        nextAttemptAt
      },
    });
  }
}
