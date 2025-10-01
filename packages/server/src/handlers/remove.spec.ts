import { CommandContext, Context } from "grammy";
import { UserService, UserWalletNotFoundError } from "../services/user";
import { InvalidEthereumAddressError } from "../services/wallet";
import { getRemoveHandler } from "./remove";

jest.mock("../services/user");

const USER_ID = 1234567890;
const REMOVE_COMMAND = "/remove";
const ETHEREUM_ADDRESS = "0xBEE9FF9F1E8608AD00EBFCD0084AE9AA7D40BBAB";

let mockUserService: jest.Mocked<UserService>;
let mockReply: jest.Mock;
let removeWallet: ReturnType<typeof getRemoveHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  jest.clearAllMocks();

  mockUserService = {
    removeWallet: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  mockReply = jest.fn();

  removeWallet = getRemoveHandler(mockUserService);

  ctx = {
    from: { id: USER_ID },
    reply: mockReply,
    message: { text: REMOVE_COMMAND + " " + ETHEREUM_ADDRESS },
  } as unknown as CommandContext<Context>;
});

it("should successfully remove a wallet and reply with success message", async () => {
  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS);
  expect(mockReply).toHaveBeenCalledWith(`Successfully removed wallet: ${ETHEREUM_ADDRESS}`);
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
  expect(mockReply).toHaveBeenCalledWith("Something went wrong. Please try again later.");
});

it("should reply with error when wallet address is invalid", async () => {
  mockUserService.removeWallet.mockRejectedValue(new InvalidEthereumAddressError());

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS);
  expect(mockReply).toHaveBeenCalledWith("Please provide a valid Ethereum address.");
});

it("should reply with specific message when wallet is not associated with user", async () => {
  mockUserService.removeWallet.mockRejectedValue(new UserWalletNotFoundError());

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS);
  expect(mockReply).toHaveBeenCalledWith(
    `Wallet ${ETHEREUM_ADDRESS} is not associated with your account.`,
  );
});

it("should reply with generic error when removing wallet fails for unknown reason", async () => {
  mockUserService.removeWallet.mockRejectedValue(new Error("Database connection failed"));

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS);
  expect(mockReply).toHaveBeenCalledWith("Something went wrong. Please try again later.");
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
  const addressWithTrailingSpaces = ETHEREUM_ADDRESS + "  ";
  ctx.message!.text = REMOVE_COMMAND + " " + addressWithTrailingSpaces;

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS);
});

it("should handle multiple spaces between command and address", async () => {
  ctx.message!.text = REMOVE_COMMAND + "     " + ETHEREUM_ADDRESS + "     ";

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS);
});
