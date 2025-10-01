import { CommandContext, Context } from "grammy";
import { UserService, UserWalletAlreadyExistsError } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { getAddHandler } from "./add";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/constants";
import { ETHEREUM_ADDRESS_1, USER_ID } from "../tests/constants";

jest.mock("../services/user");
jest.mock("../services/wallet");

const ADD_COMMAND = "/add";

let mockUserService: jest.Mocked<UserService>;
let mockWalletService: jest.Mocked<WalletService>;
let mockReply: jest.Mock;
let addWallet: ReturnType<typeof getAddHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  jest.clearAllMocks();

  mockUserService = {
    create: jest.fn(),
    addWallet: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  mockWalletService = {
    upsert: jest.fn(),
  } as unknown as jest.Mocked<WalletService>;

  mockReply = jest.fn();

  addWallet = getAddHandler(mockUserService, mockWalletService);

  ctx = {
    from: { id: USER_ID },
    reply: mockReply,
    message: { text: ADD_COMMAND + " " + ETHEREUM_ADDRESS_1 },
  } as unknown as CommandContext<Context>;
});

it("should successfully add a wallet and reply with success message", async () => {
  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.addWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS_1);
  expect(mockReply).toHaveBeenCalledWith(`Successfully added wallet: ${ETHEREUM_ADDRESS_1}`);
});

it("should reply with usage message when no wallet address is provided", async () => {
  ctx.message!.text = ADD_COMMAND;

  await addWallet(ctx);

  expect(mockWalletService.upsert).not.toHaveBeenCalled();
  expect(mockUserService.addWallet).not.toHaveBeenCalled();
  expect(mockReply).toHaveBeenCalledWith(
    "Please provide a wallet address. Usage: /add <wallet_address>",
  );
});

it("should reply with error when user ID is not found in context", async () => {
  ctx.from = undefined;

  await addWallet(ctx);

  expect(mockWalletService.upsert).not.toHaveBeenCalled();
  expect(mockUserService.addWallet).not.toHaveBeenCalled();
  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should reply with error when wallet address is invalid", async () => {
  mockWalletService.upsert.mockRejectedValue(new InvalidEthereumAddressError());

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.addWallet).not.toHaveBeenCalled();
  expect(mockReply).toHaveBeenCalledWith("Please provide a valid Ethereum address.");
});

it("should reply with generic error when wallet upsert fails for unknown reason", async () => {
  mockWalletService.upsert.mockRejectedValue(new Error("Database connection failed"));

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.addWallet).not.toHaveBeenCalled();
  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should reply with specific message when wallet is already associated with user", async () => {
  mockUserService.addWallet.mockRejectedValue(new UserWalletAlreadyExistsError());

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.addWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS_1);
  expect(mockReply).toHaveBeenCalledWith(
    `Wallet ${ETHEREUM_ADDRESS_1} is already associated with your account.`,
  );
});

it("should reply with generic error when adding wallet to user fails for unknown reason", async () => {
  mockUserService.addWallet.mockRejectedValue(new Error("Database constraint violation"));

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.addWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS_1);
  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should handle empty string address as missing address", async () => {
  ctx.message!.text = ADD_COMMAND + " ";

  await addWallet(ctx);

  expect(mockWalletService.upsert).not.toHaveBeenCalled();
  expect(mockUserService.addWallet).not.toHaveBeenCalled();
  expect(mockReply).toHaveBeenCalledWith(
    "Please provide a wallet address. Usage: /add <wallet_address>",
  );
});

it("should trim trailing whitespace in wallet address", async () => {
  const addressWithTrailingSpaces = ETHEREUM_ADDRESS_1 + "  ";
  ctx.message!.text = ADD_COMMAND + " " + addressWithTrailingSpaces;

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.addWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS_1);
});

it("should handle multiple spaces between command and address", async () => {
  ctx.message!.text = ADD_COMMAND + "     " + ETHEREUM_ADDRESS_1 + "     ";

  await addWallet(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.addWallet).toHaveBeenCalledWith(USER_ID, ETHEREUM_ADDRESS_1);
  expect(mockReply).toHaveBeenCalledWith(`Successfully added wallet: ${ETHEREUM_ADDRESS_1}`);
});
