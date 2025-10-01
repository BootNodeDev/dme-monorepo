import { PrismaClient } from "@prisma/client";
import { InvalidEthereumAddressError, WalletService, sanitizeEthereumAddress } from "./wallet";
import { ETHEREUM_ADDRESS_1 } from "../tests/constants";

jest.mock("@prisma/client");

let mockUpsert: jest.Mock;
let mockPrisma: jest.Mocked<PrismaClient>;
let wallet: WalletService;

beforeEach(() => {
  jest.clearAllMocks();

  mockUpsert = jest.fn();

  mockPrisma = {
    wallet: {
      upsert: mockUpsert,
    },
  } as unknown as jest.Mocked<PrismaClient>;

  wallet = new WalletService(mockPrisma);
});

describe("upsert", () => {
  it("should call prisma wallet upsert with sanitized address", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { id: ETHEREUM_ADDRESS_1.toLowerCase() },
      update: {},
      create: { id: ETHEREUM_ADDRESS_1.toLowerCase() },
    });
  });

  it("should throw InvalidEthereumAddressError for invalid address", async () => {
    await expect(wallet.upsert("invalid")).rejects.toBeInstanceOf(InvalidEthereumAddressError);
  });
});

describe("sanitizeEthereumAddress", () => {
  it("should return lowercase address for valid ethereum address", () => {
    const result = sanitizeEthereumAddress(ETHEREUM_ADDRESS_1);
    expect(result).toBe(ETHEREUM_ADDRESS_1.toLowerCase());
  });

  it("should throw InvalidEthereumAddressError for invalid address", () => {
    expect(() => sanitizeEthereumAddress("invalid")).toThrow(InvalidEthereumAddressError);
  });
});
