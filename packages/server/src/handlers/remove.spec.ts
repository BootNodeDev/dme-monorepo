import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService, UserWalletNotFoundError } from "../services/user";
import { InvalidEthereumAddressError } from "../services/wallet";
import { getRemoveHandler } from "./remove";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { ETHEREUM_ADDRESS_1, USER_ID_1 } from "../tests/constants";

jest.mock("../services/user");

const REMOVE_COMMAND = "/remove";

let mockLogger: jest.Mocked<Logger>;
let mockUserService: jest.Mocked<UserService>;
let mockReply: jest.Mock;
let removeWallet: ReturnType<typeof getRemoveHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  mockUserService = {
    removeWallet: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  mockReply = jest.fn();

  removeWallet = getRemoveHandler(mockLogger, mockUserService);

  ctx = {
    from: { id: USER_ID_1 },
    reply: mockReply,
    message: { text: REMOVE_COMMAND + " " + ETHEREUM_ADDRESS_1 },
  } as unknown as CommandContext<Context>;
});

it("should successfully remove a wallet and reply with success message", async () => {
  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockReply).toHaveBeenCalledWith(`Successfully removed wallet: ${ETHEREUM_ADDRESS_1}`);
});

it("should reply with usage message when no wallet address is provided", async () => {
  ctx.message!.text = REMOVE_COMMAND;

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).not.toHaveBeenCalled();
  expect(mockReply).toHaveBeenCalledWith(
    "Please provide a wallet address. Usage: /remove <wallet_address>",
  );
});

it("should reply with error when user ID is not found in context", async () => {
  ctx.from = undefined;

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).not.toHaveBeenCalled();
  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should reply with error when wallet address is invalid", async () => {
  mockUserService.removeWallet.mockRejectedValue(new InvalidEthereumAddressError());

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockReply).toHaveBeenCalledWith("Please provide a valid Ethereum address.");
});

it("should reply with specific message when wallet is not associated with user", async () => {
  mockUserService.removeWallet.mockRejectedValue(new UserWalletNotFoundError());

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockReply).toHaveBeenCalledWith(
    `Wallet ${ETHEREUM_ADDRESS_1} is not associated with your account.`,
  );
});

it("should reply with generic error when removing wallet fails for unknown reason", async () => {
  mockUserService.removeWallet.mockRejectedValue(new Error("Database connection failed"));

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should handle empty string address as missing address", async () => {
  ctx.message!.text = REMOVE_COMMAND + " ";

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).not.toHaveBeenCalled();
  expect(mockReply).toHaveBeenCalledWith(
    "Please provide a wallet address. Usage: /remove <wallet_address>",
  );
});

it("should trim trailing whitespace in wallet address", async () => {
  const addressWithTrailingSpaces = ETHEREUM_ADDRESS_1 + "  ";
  ctx.message!.text = REMOVE_COMMAND + " " + addressWithTrailingSpaces;

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
});

it("should handle multiple spaces between command and address", async () => {
  ctx.message!.text = REMOVE_COMMAND + "     " + ETHEREUM_ADDRESS_1 + "     ";

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
});
