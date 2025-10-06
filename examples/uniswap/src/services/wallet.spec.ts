import { InvalidEthereumAddressError, WalletService, sanitizeEthereumAddress } from "./wallet";
import { ETHEREUM_ADDRESS_1 } from "../tests/constants";
import { prisma } from "../tests/setup";

let wallet: WalletService;

beforeEach(() => {
  wallet = new WalletService(prisma);
});

describe("upsert", () => {
  it("should create wallet with sanitized address", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);

    const result = await prisma.wallet.findMany({});
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(ETHEREUM_ADDRESS_1.toLowerCase());
  });

  it("should not fail when upserting existing wallet", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await wallet.upsert(ETHEREUM_ADDRESS_1);

    const result = await prisma.wallet.findMany({});
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(ETHEREUM_ADDRESS_1.toLowerCase());
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
