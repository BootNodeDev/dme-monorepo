import { Prisma } from "@prisma/client";
import {
  InvalidWalletIndexError,
  UserAlreadyExistsError,
  UserService,
  UserWalletAlreadyExistsError,
} from "./user";
import { InvalidEthereumAddressError, WalletService } from "./wallet";
import {
  ETHEREUM_ADDRESS_1,
  ETHEREUM_ADDRESS_2,
  USER_ID_1,
  WALLET_INDEX,
} from "../tests/constants";
import { prisma } from "../tests/setup";

let user: UserService;
let wallet: WalletService;

beforeEach(() => {
  user = new UserService(prisma);
  wallet = new WalletService(prisma);
});

describe("create", () => {
  it("should create a user", async () => {
    await user.create(USER_ID_1);

    const result = await prisma.user.findMany({});
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(USER_ID_1);
  });

  it("should throw UserAlreadyExistsError when user already exists", async () => {
    await user.create(USER_ID_1);

    await expect(user.create(USER_ID_1)).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  it("should bubble up any unhandled error", async () => {
    jest
      .spyOn(prisma.user, "create")
      .mockRejectedValueOnce(
        new Prisma.PrismaClientUnknownRequestError("Database error", { clientVersion: "5.0.0" }),
      );

    await expect(user.create(USER_ID_1)).rejects.toBeInstanceOf(
      Prisma.PrismaClientUnknownRequestError,
    );
  });
});

describe("addWallet", () => {
  it("should add wallet to user", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.create(USER_ID_1);

    await user.addWallet(USER_ID_1, ETHEREUM_ADDRESS_1);

    const result = await prisma.userWallet.findMany({});
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(USER_ID_1);
    expect(result[0].walletId).toBe(ETHEREUM_ADDRESS_1.toLowerCase());
  });

  it("should throw UserWalletAlreadyExistsError when wallet already added", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.create(USER_ID_1);
    await user.addWallet(USER_ID_1, ETHEREUM_ADDRESS_1);

    await expect(user.addWallet(USER_ID_1, ETHEREUM_ADDRESS_1)).rejects.toBeInstanceOf(
      UserWalletAlreadyExistsError,
    );
  });

  it("should throw when the address is invalid", async () => {
    await expect(user.addWallet(USER_ID_1, "invalid-address")).rejects.toBeInstanceOf(
      InvalidEthereumAddressError,
    );
  });

  it("should bubble up any unhandled error", async () => {
    jest
      .spyOn(prisma.userWallet, "create")
      .mockRejectedValueOnce(
        new Prisma.PrismaClientUnknownRequestError("Database error", { clientVersion: "5.0.0" }),
      );

    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.create(USER_ID_1);

    await expect(user.addWallet(USER_ID_1, ETHEREUM_ADDRESS_1)).rejects.toBeInstanceOf(
      Prisma.PrismaClientUnknownRequestError,
    );
  });
});

describe("listWallets", () => {
  it("should return array of wallet addresses when user has wallets", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await wallet.upsert(ETHEREUM_ADDRESS_2);
    await user.create(USER_ID_1);
    await user.addWallet(USER_ID_1, ETHEREUM_ADDRESS_1);
    await user.addWallet(USER_ID_1, ETHEREUM_ADDRESS_2);

    const result = await user.listWallets(USER_ID_1);

    expect(result).toEqual([ETHEREUM_ADDRESS_1.toLowerCase(), ETHEREUM_ADDRESS_2.toLowerCase()]);
  });

  it("should return empty array when user has no wallets", async () => {
    await user.create(USER_ID_1);

    const result = await user.listWallets(USER_ID_1);

    expect(result).toEqual([]);
  });
});

describe("removeWallet", () => {
  it("should remove wallet from user", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.create(USER_ID_1);
    await user.addWallet(USER_ID_1, ETHEREUM_ADDRESS_1);

    const deletedWalletId = await user.removeWallet(USER_ID_1, WALLET_INDEX);
    expect(deletedWalletId).toBe(ETHEREUM_ADDRESS_1.toLowerCase());

    const result = await prisma.userWallet.findMany({});
    expect(result).toHaveLength(0);
  });

  it("should throw InvalidWalletIndexError when the provided index is not found", async () => {
    await expect(user.removeWallet(USER_ID_1, WALLET_INDEX)).rejects.toBeInstanceOf(
      InvalidWalletIndexError,
    );
  });

  it("should bubble up any unhandled error", async () => {
    await wallet.upsert(ETHEREUM_ADDRESS_1);
    await user.create(USER_ID_1);
    await user.addWallet(USER_ID_1, ETHEREUM_ADDRESS_1);

    jest
      .spyOn(prisma.userWallet, "delete")
      .mockRejectedValueOnce(
        new Prisma.PrismaClientUnknownRequestError("Database error", { clientVersion: "5.0.0" }),
      );

    await expect(user.removeWallet(USER_ID_1, WALLET_INDEX)).rejects.toBeInstanceOf(
      Prisma.PrismaClientUnknownRequestError,
    );
  });
});
