import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { getListHandler } from "./list";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { ETHEREUM_ADDRESS_1, ETHEREUM_ADDRESS_2, USER_ID_1 } from "../tests/constants";

jest.mock("../services/user");

const LIST_COMMAND = "/list";

let mockLogger: jest.Mocked<Logger>;
let mockUserService: jest.Mocked<UserService>;
let mockReply: jest.Mock;
let listWallets: ReturnType<typeof getListHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  mockUserService = {
    create: jest.fn(),
    addWallet: jest.fn(),
    listWallets: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  mockReply = jest.fn();

  listWallets = getListHandler(mockLogger, mockUserService);

  ctx = {
    from: { id: USER_ID_1 },
    reply: mockReply,
    message: { text: LIST_COMMAND },
  } as unknown as CommandContext<Context>;
});

it("should reply with empty message when user has no wallets", async () => {
  mockUserService.listWallets.mockResolvedValue([]);

  await listWallets(ctx);

  expect(mockUserService.listWallets).toHaveBeenCalledWith(USER_ID_1);
  expect(mockReply).toHaveBeenCalledWith(
    "You don't have any wallets associated with your account yet.\n\nUse /add <wallet_address> to add one.",
  );
});

it("should reply with formatted list when user has multiple wallets", async () => {
  mockUserService.listWallets.mockResolvedValue([
    ETHEREUM_ADDRESS_1.toLowerCase(),
    ETHEREUM_ADDRESS_2.toLowerCase(),
  ]);

  await listWallets(ctx);

  expect(mockUserService.listWallets).toHaveBeenCalledWith(USER_ID_1);
  expect(mockReply).toHaveBeenCalledWith(
    "Your wallets:\n\n1. 0xbee9...bbab\n2. 0xcf48...bd8d",
  );
});

it("should reply with error when user ID is not found in context", async () => {
  ctx.from = undefined;

  await listWallets(ctx);

  expect(mockUserService.listWallets).not.toHaveBeenCalled();
  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should reply with error when listing wallets fails", async () => {
  mockUserService.listWallets.mockRejectedValue(new Error("Database connection failed"));

  await listWallets(ctx);

  expect(mockUserService.listWallets).toHaveBeenCalledWith(USER_ID_1);
  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});
