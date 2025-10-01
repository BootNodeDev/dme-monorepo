import { Prisma, PrismaClient } from "@prisma/client";
import { sanitizeEthereumAddress } from "./wallet";

export class UserAlreadyExistsError extends Error {}

export class UserWalletAlreadyExistsError extends Error {}

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async create(userId: number) {
    try {
      await this.prisma.user.create({ data: { id: userId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new UserWalletAlreadyExistsError();
      }

      throw error;
    }
  }
}
