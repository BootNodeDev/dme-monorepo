import { InvalidEthereumAddressError, WalletService, sanitizeEthereumAddress } from "./wallet";
import {
  ETHEREUM_ADDRESS_1,
  ETHEREUM_ADDRESS_2,
  ETHEREUM_ADDRESS_3,
  USER_ID_1,
  USER_ID_2,
  USER_ID_3,
} from "../tests/constants";
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

describe("listAll", () => {
  it("should return a list of addresses", async () => {
    await prisma.user.create({ data: { id: USER_ID_1 } });
    await prisma.wallet.create({ data: { id: ETHEREUM_ADDRESS_1.toLowerCase() } });
    await prisma.userWallet.create({
      data: { userId: USER_ID_1, walletId: ETHEREUM_ADDRESS_1.toLowerCase() },
    });

    expect(await wallet.listAll()).toEqual([ETHEREUM_ADDRESS_1.toLowerCase()]);
  });

  it("should return unique wallets with no repeated values", async () => {
    await prisma.user.createMany({
      data: [{ id: USER_ID_1 }, { id: USER_ID_2 }],
    });

    await prisma.wallet.create({
      data: { id: ETHEREUM_ADDRESS_1.toLowerCase() },
    });

    await prisma.userWallet.createMany({
      data: [
        { userId: USER_ID_1, walletId: ETHEREUM_ADDRESS_1.toLowerCase() },
        { userId: USER_ID_2, walletId: ETHEREUM_ADDRESS_1.toLowerCase() },
      ],
    });

    expect(await wallet.listAll()).toEqual([ETHEREUM_ADDRESS_1.toLowerCase()]);
  });

  it("should ignore wallets that are not associated with any user", async () => {
    await prisma.wallet.create({
      data: { id: ETHEREUM_ADDRESS_1.toLowerCase() },
    });

    const result = await wallet.listAll();

    expect(result).toHaveLength(0);
  });
});

describe("listAll with pagination", () => {
  it("should return paginated results based on take and skip", async () => {
    await prisma.user.createMany({
      data: [{ id: USER_ID_1 }, { id: USER_ID_2 }, { id: USER_ID_3 }],
    });

    await prisma.wallet.createMany({
      data: [
        { id: ETHEREUM_ADDRESS_1.toLowerCase() },
        { id: ETHEREUM_ADDRESS_2.toLowerCase() },
        { id: ETHEREUM_ADDRESS_3.toLowerCase() },
      ],
    });

    await prisma.userWallet.createMany({
      data: [
        { userId: USER_ID_1, walletId: ETHEREUM_ADDRESS_1.toLowerCase() },
        { userId: USER_ID_2, walletId: ETHEREUM_ADDRESS_2.toLowerCase() },
        { userId: USER_ID_3, walletId: ETHEREUM_ADDRESS_3.toLowerCase() },
      ],
    });

    expect(await wallet.listAll({ take: 2 })).toEqual([
      ETHEREUM_ADDRESS_1.toLowerCase(),
      ETHEREUM_ADDRESS_2.toLowerCase(),
    ]);

    expect(await wallet.listAll({ skip: 2 })).toEqual([ETHEREUM_ADDRESS_3.toLowerCase()]);

    expect(await wallet.listAll({ take: 1, skip: 1 })).toEqual([ETHEREUM_ADDRESS_2.toLowerCase()]);
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
