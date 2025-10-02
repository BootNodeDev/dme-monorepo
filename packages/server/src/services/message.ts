import { PrismaClient } from "@prisma/client";
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
}
