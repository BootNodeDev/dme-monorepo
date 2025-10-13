import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { MessageService } from "../services/message";
import { getAddHandler } from "./add";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { ETHEREUM_ADDRESS_1, USER_ID_1 } from "../tests/constants";
import {
  getMockUserService,
  getMockMessageService,
  getMockLogger,
  getMockWalletService,
} from "../tests/mocks";

const ADD_COMMAND = "/add";

let mockLogger: jest.Mocked<Logger>;
let mockUserService: jest.Mocked<UserService>;
let mockWalletService: jest.Mocked<WalletService>;
let mockMessageService: jest.Mocked<MessageService>;
let addWallet: ReturnType<typeof getAddHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  mockLogger = getMockLogger();
  mockUserService = getMockUserService();
  mockWalletService = getMockWalletService();
  mockMessageService = getMockMessageService();

  addWallet = getAddHandler(mockLogger, mockMessageService, mockUserService, mockWalletService);

  ctx = {
    from: { id: USER_ID_1 },
    message: { text: ADD_COMMAND + " " + ETHEREUM_ADDRESS_1 },
  } as unknown as CommandContext<Context>;
});

it("should add wallet and send success message", async () => {
  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "Successfully added 0xBEE9...BBAB",
    USER_ID_1,
  );
});

it("should show usage message when address is missing", async () => {
  ctx.message!.text = ADD_COMMAND;

  await addWallet(ctx);

  expect(mockWalletService.upsert).not.toHaveBeenCalled();
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "Please provide a wallet address.\n\nUsage: /add <address>",
    USER_ID_1,
  );
});

it("should ignore request without user context", async () => {
  ctx.from = undefined;

  await addWallet(ctx);

  expect(mockWalletService.upsert).not.toHaveBeenCalled();
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).not.toHaveBeenCalled();
});

it("should reject invalid Ethereum address", async () => {
  mockWalletService.upsert.mockRejectedValue(new InvalidEthereumAddressError());

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "Please provide a valid Ethereum address.",
    USER_ID_1,
  );
});

it("should handle wallet service errors gracefully", async () => {
  mockWalletService.upsert.mockRejectedValue(new Error("Database connection failed"));

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    UNEXPECTED_ERROR_MESSAGE,
    USER_ID_1,
  );
});

it("should handle user service errors gracefully", async () => {
  mockUserService.upsertWallet.mockRejectedValue(new Error("Database constraint violation"));

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    UNEXPECTED_ERROR_MESSAGE,
    USER_ID_1,
  );
});

it("should treat empty address as missing", async () => {
  ctx.message!.text = ADD_COMMAND + " ";

  await addWallet(ctx);

  expect(mockWalletService.upsert).not.toHaveBeenCalled();
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "Please provide a wallet address.\n\nUsage: /add <address>",
    USER_ID_1,
  );
});

it("should trim whitespace from address", async () => {
  const addressWithTrailingSpaces = ETHEREUM_ADDRESS_1 + "  ";
  ctx.message!.text = ADD_COMMAND + " " + addressWithTrailingSpaces;

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
});

it("should handle extra whitespace between command and address", async () => {
  ctx.message!.text = ADD_COMMAND + "     " + ETHEREUM_ADDRESS_1 + "     ";

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "Successfully added 0xBEE9...BBAB",
    USER_ID_1,
  );
});
