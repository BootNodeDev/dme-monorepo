import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const EthereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export class InvalidEthereumAddressError extends Error {}

export class WalletService {
  constructor(private prisma: PrismaClient) {}

  async upsert(address: string) {
    const id = sanitizeEthereumAddress(address);

    await this.prisma.wallet.upsert({
      where: { id },
      update: {},
      create: { id },
    });
  }
}

export function sanitizeEthereumAddress(address: string): string {
  try {
    return EthereumAddressSchema.parse(address).toLowerCase();
  } catch {
    throw new InvalidEthereumAddressError();
  }
}
