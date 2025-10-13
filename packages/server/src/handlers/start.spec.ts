import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { getStartHandler } from "./start";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { ETHEREUM_ADDRESS_1, USER_ID_1 } from "../tests/constants";
import {
  getMockLogger,
  getMockMessageService,
  getMockUserService,
  getMockWalletService,
} from "../tests/mocks";
import { MessageService } from "../services/message";

const START_COMMAND = "/start";

let mockLogger: jest.Mocked<Logger>;
let mockUserService: jest.Mocked<UserService>;
let mockWalletService: jest.Mocked<WalletService>;
let mockMessageService: jest.Mocked<MessageService>;
let start: ReturnType<typeof getStartHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  mockLogger = getMockLogger();
  mockUserService = getMockUserService();
  mockWalletService = getMockWalletService();
  mockMessageService = getMockMessageService();

  start = getStartHandler(mockLogger, mockMessageService, mockUserService, mockWalletService);

  ctx = {
    from: { id: USER_ID_1 },
    message: { text: START_COMMAND + " " + ETHEREUM_ADDRESS_1 },
  } as unknown as CommandContext<Context>;
});

it("should reply with a welcome message", async () => {
  ctx.message!.text = START_COMMAND;

  await start(ctx);

  expect(mockMessageService.createForUser).toHaveBeenCalledWith(`Welcome!`, USER_ID_1);
});

it("should reply with the address of the wallet being subscribed", async () => {
  await start(ctx);

  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    `Welcome!\n\nYou have successfully subscribed 0xBEE9...BBAB`,
    USER_ID_1,
  );
});

it("should reply with an error when wallet upsert fails due to invalid address", async () => {
  mockWalletService.upsert.mockRejectedValue(new InvalidEthereumAddressError());

  await start(ctx);

  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "Please provide a valid Ethereum address.",
    USER_ID_1,
  );
});

it("should reply with an error when wallet upsert fails for an unknown reason", async () => {
  mockWalletService.upsert.mockRejectedValue(new Error("Unknown error"));

  await start(ctx);

  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    UNEXPECTED_ERROR_MESSAGE,
    USER_ID_1,
  );
});

it("should reply with an error when the user id is not found in context", async () => {
  mockWalletService.upsert.mockRejectedValue(new Error("Unknown error"));

  ctx.from = undefined;

  await start(ctx);

  expect(mockMessageService.createForUser).not.toHaveBeenCalled();
});

it("should reply with an error when user create fails for an unknown reason", async () => {
  mockUserService.upsert.mockRejectedValue(new Error("Unknown error"));

  await start(ctx);

  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    UNEXPECTED_ERROR_MESSAGE,
    USER_ID_1,
  );
});

it("should reply with an error when adding wallet to user fails for an unknown reason", async () => {
  mockUserService.upsertWallet.mockRejectedValue(new Error("Unknown error"));

  await start(ctx);

  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    UNEXPECTED_ERROR_MESSAGE,
    USER_ID_1,
  );
});

it("should handle multiple spaces between command and address", async () => {
  ctx.message!.text = START_COMMAND + "     " + ETHEREUM_ADDRESS_1 + "     ";

  await start(ctx);

  expect(mockWalletService.upsert).toHaveBeenCalledWith(ETHEREUM_ADDRESS_1);
  expect(mockUserService.upsertWallet).toHaveBeenCalledWith(USER_ID_1, ETHEREUM_ADDRESS_1);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    `Welcome!\n\nYou have successfully subscribed 0xBEE9...BBAB`,
    USER_ID_1,
  );
});
