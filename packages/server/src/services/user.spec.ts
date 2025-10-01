import { Prisma, PrismaClient } from "@prisma/client";
import { UserAlreadyExistsError, UserService, UserWalletAlreadyExistsError } from "./user";
import { InvalidEthereumAddressError } from "./wallet";

jest.mock("@prisma/client", () => ({
  ...jest.requireActual("@prisma/client"),
  PrismaClient: jest.fn(),
}));

const USER_ID = 1234567890;
const ETHEREUM_ADDRESS_1 = "0xBEE9FF9F1E8608AD00EBFCD0084AE9AA7D40BBAB";
const ETHEREUM_ADDRESS_2 = "0xCF48B6167EE25BB3A91EA9FFCC7931075A6EBD8D";

let mockCreate: jest.Mock;
let mockFindMany: jest.Mock;
let mockPrisma: jest.Mocked<PrismaClient>;
let user: UserService;

beforeEach(() => {
  jest.clearAllMocks();

  mockCreate = jest.fn();
  mockFindMany = jest.fn();

  mockPrisma = {
    user: {
      create: mockCreate,
    },
    userWallet: {
      create: mockCreate,
      findMany: mockFindMany,
    },
  } as unknown as jest.Mocked<PrismaClient>;

  user = new UserService(mockPrisma);
});

describe("create", () => {
  it("should call prisma user create", async () => {
    await user.create(USER_ID);

    expect(mockCreate).toHaveBeenCalledWith({ data: { id: USER_ID } });
  });

  it("should throw if prisma fails with a P2002 error", async () => {
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("", {
        code: "P2002",
        clientVersion: "",
      }),
    );

    await expect(user.create(USER_ID)).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  it("should bubble up any unhandled error", async () => {
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientUnknownRequestError("", { clientVersion: "" }),
    );

    await expect(user.create(USER_ID)).rejects.toBeInstanceOf(
      Prisma.PrismaClientUnknownRequestError,
    );
  });
});

describe("addWallet", () => {
  it("should call prisma userWallet create", async () => {
    await user.addWallet(USER_ID, ETHEREUM_ADDRESS_1);

    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: USER_ID, walletId: ETHEREUM_ADDRESS_1.toLowerCase() },
    });
  });

  it("should throw if prisma fails with a P2002 error", async () => {
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("", {
        code: "P2002",
        clientVersion: "",
      }),
    );

    await expect(user.addWallet(USER_ID, ETHEREUM_ADDRESS_1)).rejects.toBeInstanceOf(
      UserWalletAlreadyExistsError,
    );
  });

  it("should bubble up any unhandled error", async () => {
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientUnknownRequestError("", { clientVersion: "" }),
    );

    await expect(user.addWallet(USER_ID, ETHEREUM_ADDRESS_1)).rejects.toBeInstanceOf(
      Prisma.PrismaClientUnknownRequestError,
    );
  });

  it("should throw when the address is invalid", async () => {
    await expect(user.addWallet(USER_ID, "invalid-address")).rejects.toBeInstanceOf(
      InvalidEthereumAddressError,
    );
  });
});

describe("listWallets", () => {
  it("should return array of wallet addresses when user has wallets", async () => {
    const mockUserWallets = [
      { walletId: ETHEREUM_ADDRESS_1.toLowerCase() },
      { walletId: ETHEREUM_ADDRESS_2.toLowerCase() },
    ];

    mockFindMany.mockResolvedValue(mockUserWallets);

    const result = await user.listWallets(USER_ID);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      include: { wallet: true },
      orderBy: { createdAt: "asc" },
    });

    expect(result).toEqual([ETHEREUM_ADDRESS_1.toLowerCase(), ETHEREUM_ADDRESS_2.toLowerCase()]);
  });

  it("should bubble up any database error", async () => {
    mockFindMany.mockRejectedValue(new Error("Database connection failed"));

    await expect(user.listWallets(USER_ID)).rejects.toThrow("Database connection failed");
  });
});
