import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { MessageService } from "../services/message";
import { getListHandler } from "./list";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { ETHEREUM_ADDRESS_1, ETHEREUM_ADDRESS_2, USER_ID_1 } from "../tests/constants";
import { getMockUserService, getMockMessageService, getMockLogger } from "../tests/mocks";

const LIST_COMMAND = "/list";

let mockLogger: jest.Mocked<Logger>;
let mockUserService: jest.Mocked<UserService>;
let mockMessageService: jest.Mocked<MessageService>;
let listWallets: ReturnType<typeof getListHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  mockLogger = getMockLogger();
  mockUserService = getMockUserService();
  mockMessageService = getMockMessageService();

  listWallets = getListHandler(mockLogger, mockMessageService, mockUserService);

  ctx = {
    from: { id: USER_ID_1 },
    message: { text: LIST_COMMAND },
  } as unknown as CommandContext<Context>;
});

it("should reply with empty message when user has no wallets", async () => {
  mockUserService.listWallets.mockResolvedValue([]);

  await listWallets(ctx);

  expect(mockUserService.listWallets).toHaveBeenCalledWith(USER_ID_1);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "You don't have any wallets associated with your account yet.\n\nUse /add <address> to add one.",
    USER_ID_1,
  );
});

it("should reply with formatted list when user has multiple wallets", async () => {
  mockUserService.listWallets.mockResolvedValue([
    ETHEREUM_ADDRESS_1.toLowerCase(),
    ETHEREUM_ADDRESS_2.toLowerCase(),
  ]);

  await listWallets(ctx);

  expect(mockUserService.listWallets).toHaveBeenCalledWith(USER_ID_1);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "Your wallets:\n\n1. 0xbee9...bbab\n2. 0xcf48...bd8d",
    USER_ID_1,
  );
});

it("should reply with error when user ID is not found in context", async () => {
  ctx.from = undefined;

  await listWallets(ctx);

  expect(mockUserService.listWallets).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).not.toHaveBeenCalled();
});

it("should reply with error when listing wallets fails", async () => {
  mockUserService.listWallets.mockRejectedValue(new Error("Database connection failed"));

  await listWallets(ctx);

  expect(mockUserService.listWallets).toHaveBeenCalledWith(USER_ID_1);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    UNEXPECTED_ERROR_MESSAGE,
    USER_ID_1,
  );
});
