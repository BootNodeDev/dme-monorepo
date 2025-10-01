import { PrismaClient } from "@prisma/client";
import {
  InvalidEthereumAddressError,
  WalletService,
  sanitizeEthereumAddress,
} from "./wallet";

jest.mock("@prisma/client");

const ETHEREUM_ADDRESS = "0xBEE9FF9F1E8608AD00EBFCD0084AE9AA7D40BBAB";
const INVALID_ADDRESS = "invalid-address";

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
    await wallet.upsert(ETHEREUM_ADDRESS);

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { id: ETHEREUM_ADDRESS.toLowerCase() },
      update: {},
      create: { id: ETHEREUM_ADDRESS.toLowerCase() },
    });
  });

  it("should throw InvalidEthereumAddressError for invalid address", async () => {
    await expect(wallet.upsert(INVALID_ADDRESS)).rejects.toBeInstanceOf(
      InvalidEthereumAddressError
    );
  });
});

describe("sanitizeEthereumAddress", () => {
  it("should return lowercase address for valid ethereum address", () => {
    const result = sanitizeEthereumAddress(ETHEREUM_ADDRESS);
    expect(result).toBe(ETHEREUM_ADDRESS.toLowerCase());
  });

  it("should throw InvalidEthereumAddressError for invalid address", () => {
    expect(() => sanitizeEthereumAddress(INVALID_ADDRESS)).toThrow(
      InvalidEthereumAddressError
    );
  });

  it("should throw InvalidEthereumAddressError for address without 0x prefix", () => {
    expect(() =>
      sanitizeEthereumAddress("bee9ff9f1e8608ad00ebfcd0084ae9aa7d40bbab")
    ).toThrow(InvalidEthereumAddressError);
  });

  it("should throw InvalidEthereumAddressError for address with wrong length", () => {
    expect(() =>
      sanitizeEthereumAddress("0xbee9ff9f1e8608ad00ebfcd0084ae9aa7d40bb")
    ).toThrow(InvalidEthereumAddressError);
  });
});
