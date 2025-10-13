import { PrismaClient } from "@prisma/client";
import { sanitizeEthereumAddress } from "./wallet";

export class InvalidWalletIndexError extends Error {}

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async upsert(userId: number) {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });
  }

  async upsertWallet(userId: number, address: string) {
    const walletId = sanitizeEthereumAddress(address);

    await this.prisma.userWallet.upsert({
      where: { userId_walletId: { userId, walletId } },
      update: {},
      create: { userId, walletId },
    });
  }

  async listWallets(userId: number): Promise<string[]> {
    const userWallets = await this.prisma.userWallet.findMany({
      where: { userId },
      include: { wallet: true },
      orderBy: { createdAt: "asc" },
    });

    return userWallets.map((userWallet) => userWallet.walletId);
  }

  async removeWallet(userId: number, index: number): Promise<string> {
    const wallets = await this.listWallets(userId);

    const walletId = wallets[index - 1];

    if (!walletId) {
      throw new InvalidWalletIndexError();
    }

    const { walletId: deletedWalletId } = await this.prisma.userWallet.delete({
      where: { userId_walletId: { userId, walletId } },
    });

    return deletedWalletId;
  }
}
