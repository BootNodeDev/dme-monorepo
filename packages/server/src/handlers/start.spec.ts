import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import {
  UserAlreadyExistsError,
  UserService,
  UserWalletAlreadyExistsError,
} from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { getStartHandler } from "./start";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { ETHEREUM_ADDRESS_1, USER_ID_1 } from "../tests/constants";

jest.mock("../services/user");
jest.mock("../services/wallet");

const START_COMMAND = "/start";

let mockLogger: jest.Mocked<Logger>;
let mockUserService: jest.Mocked<UserService>;
let mockWalletService: jest.Mocked<WalletService>;
let mockReply: jest.Mock;
let start: ReturnType<typeof getStartHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  mockUserService = {
    create: jest.fn(),
    addWallet: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  mockWalletService = {
    upsert: jest.fn(),
  } as unknown as jest.Mocked<WalletService>;

  mockReply = jest.fn();

  start = getStartHandler(mockLogger, mockUserService, mockWalletService);

  ctx = {
    from: { id: USER_ID_1 },
    reply: mockReply,
    message: { text: START_COMMAND + " " + ETHEREUM_ADDRESS_1 },
  } as unknown as CommandContext<Context>;
});

it("should reply with a welcome message if the user is new", async () => {
  ctx.message!.text = START_COMMAND;

  await start(ctx);

  expect(mockReply).toHaveBeenCalledWith("Welcome!");
});

it("should reply with a welcome back message if the user already exists", async () => {
  mockUserService.create.mockRejectedValue(new UserAlreadyExistsError());

  ctx.message!.text = START_COMMAND;

  await start(ctx);

  expect(mockReply).toHaveBeenCalledWith("Welcome back!");
});

it("should reply with the address of the wallet being subscribed", async () => {
  await start(ctx);

  expect(mockReply).toHaveBeenCalledWith(
    `Welcome!\nYou have successfully subscribed the wallet: ${ETHEREUM_ADDRESS_1}`,
  );
});

it("should reply only with welcome if the wallet was already added", async () => {
  mockUserService.addWallet.mockRejectedValue(new UserWalletAlreadyExistsError());

  await start(ctx);

  expect(mockReply).toHaveBeenCalledWith("Welcome!");
});

it("should reply with an error when wallet upsert fails due to invalid address", async () => {
  mockWalletService.upsert.mockRejectedValue(new InvalidEthereumAddressError());

  await start(ctx);

  expect(mockReply).toHaveBeenCalledWith("Please provide a valid Ethereum address.");
});

it("should reply with an error when wallet upsert fails for an unknown reason", async () => {
  mockWalletService.upsert.mockRejectedValue(new Error("Unknown error"));

  await start(ctx);

  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should reply with an error when the user id is not found in context", async () => {
  mockWalletService.upsert.mockRejectedValue(new Error("Unknown error"));

  ctx.from = undefined;

  await start(ctx);

  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should reply with an error when user create fails for an unknown reason", async () => {
  mockUserService.create.mockRejectedValue(new Error("Unknown error"));

  await start(ctx);

  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should reply with an error when adding wallet to user fails for an unknown reason", async () => {
  mockUserService.addWallet.mockRejectedValue(new Error("Unknown error"));

  await start(ctx);

  expect(mockReply).toHaveBeenCalledWith(UNEXPECTED_ERROR_MESSAGE);
});

it("should handle multiple spaces between command and address", async () => {
  ctx.message!.text = START_COMMAND + "     " + ETHEREUM_ADDRESS_1 + "     ";

  await start(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.addWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockReply).toHaveBeenCalledWith(
    `Welcome!\nYou have successfully subscribed the wallet: ${ETHEREUM_ADDRESS_1}`,
  );
});
