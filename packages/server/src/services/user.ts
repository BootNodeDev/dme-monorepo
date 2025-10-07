import { Prisma, PrismaClient } from "@prisma/client";
import { sanitizeEthereumAddress } from "./wallet";

export class UserAlreadyExistsError extends Error {}

export class UserWalletAlreadyExistsError extends Error {}

export class InvalidWalletIndexError extends Error {}

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async create(userId: number) {
    try {
      await this.prisma.user.create({ data: { id: userId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new UserAlreadyExistsError();
      }

      throw error;
    }
  }

  async addWallet(userId: number, address: string) {
    const walletId = sanitizeEthereumAddress(address);

    try {
      await this.prisma.userWallet.create({ data: { userId, walletId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new UserWalletAlreadyExistsError();
      }

      throw error;
    }
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
