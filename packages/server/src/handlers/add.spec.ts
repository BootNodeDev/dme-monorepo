import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { MessageService } from "../services/message";
import { getAddHandler } from "./add";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { ETHEREUM_ADDRESS_1, USER_ID_1 } from "../tests/constants";
import { getMockUserService, getMockMessageService } from "../tests/mocks";

jest.mock("../services/user");
jest.mock("../services/wallet");

const ADD_COMMAND = "/add";

let mockLogger: jest.Mocked<Logger>;
let mockUserService: jest.Mocked<UserService>;
let mockWalletService: jest.Mocked<WalletService>;
let mockMessageService: jest.Mocked<MessageService>;
let addWallet: ReturnType<typeof getAddHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  mockUserService = getMockUserService();

  mockWalletService = {
    upsert: jest.fn(),
  } as unknown as jest.Mocked<WalletService>;

  mockMessageService = getMockMessageService();

  addWallet = getAddHandler(mockLogger, mockMessageService, mockUserService, mockWalletService);

  ctx = {
    from: { id: USER_ID_1 },
    message: { text: ADD_COMMAND + " " + ETHEREUM_ADDRESS_1 },
  } as unknown as CommandContext<Context>;
});

it("should successfully add a wallet and reply with success message", async () => {
  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockMessageService.createForCtx).toHaveBeenCalledWith("Successfully added 0xBEE9...BBAB", ctx);
});

it("should reply with usage message when no wallet address is provided", async () => {
  ctx.message!.text = ADD_COMMAND;

  await addWallet(ctx);

  expect(mockWalletService.upsert).not.toHaveBeenCalled();
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForCtx).toHaveBeenCalledWith(
    "Please provide a wallet address.\n\nUsage: /add <address>",
    ctx,
  );
});

it("should reply with error when user ID is not found in context", async () => {
  ctx.from = undefined;

  await addWallet(ctx);

  expect(mockWalletService.upsert).not.toHaveBeenCalled();
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForCtx).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE, ctx);
});

it("should reply with error when wallet address is invalid", async () => {
  mockWalletService.upsert.mockRejectedValue(new InvalidEthereumAddressError());

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForCtx).toHaveBeenCalledWith("Please provide a valid Ethereum address.", ctx);
});

it("should reply with generic error when wallet upsert fails for unknown reason", async () => {
  mockWalletService.upsert.mockRejectedValue(new Error("Database connection failed"));

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForCtx).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE, ctx);
});

it("should reply with generic error when adding wallet to user fails for unknown reason", async () => {
  mockUserService.upsertWallet.mockRejectedValue(new Error("Database constraint violation"));

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockMessageService.createForCtx).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE, ctx);
});

it("should handle empty string address as missing address", async () => {
  ctx.message!.text = ADD_COMMAND + " ";

  await addWallet(ctx);

  expect(mockWalletService.upsert).not.toHaveBeenCalled();
  expect(mockUserService.upsertWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForCtx).toHaveBeenCalledWith(
    "Please provide a wallet address.\n\nUsage: /add <address>",
    ctx,
  );
});

it("should trim trailing whitespace in wallet address", async () => {
  const addressWithTrailingSpaces = ETHEREUM_ADDRESS_1 + "  ";
  ctx.message!.text = ADD_COMMAND + " " + addressWithTrailingSpaces;

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
});

it("should handle multiple spaces between command and address", async () => {
  ctx.message!.text = ADD_COMMAND + "     " + ETHEREUM_ADDRESS_1 + "     ";

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockMessageService.createForCtx).toHaveBeenCalledWith("Successfully added 0xBEE9...BBAB", ctx);
});
