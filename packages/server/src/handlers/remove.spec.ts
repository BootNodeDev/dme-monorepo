import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { InvalidWalletIndexError, UserService } from "../services/user";
import { getRemoveHandler } from "./remove";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { USER_ID_1, WALLET_INDEX, ETHEREUM_ADDRESS_1 } from "../tests/constants";
import { MessageService } from "../services/message";
import { getMockLogger, getMockMessageService, getMockUserService } from "../tests/mocks";

const REMOVE_COMMAND = "/remove";

let mockLogger: jest.Mocked<Logger>;
let mockUserService: jest.Mocked<UserService>;
let mockMessageService: jest.Mocked<MessageService>;
let removeWallet: ReturnType<typeof getRemoveHandler>;
let ctx: CommandContext<Context>;

beforeEach(() => {
  mockLogger = getMockLogger();
  mockUserService = getMockUserService();
  mockMessageService = getMockMessageService();

  removeWallet = getRemoveHandler(mockLogger, mockMessageService, mockUserService);

  ctx = {
    from: { id: USER_ID_1 },
    message: { text: REMOVE_COMMAND + " " + WALLET_INDEX },
  } as unknown as CommandContext<Context>;
});

it("should successfully remove a wallet and reply with success message", async () => {
  mockUserService.removeWallet.mockResolvedValue(ETHEREUM_ADDRESS_1);

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, WALLET_INDEX);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    `Successfully removed 0xBEE9...BBAB`,
    USER_ID_1,
  );
});

it("should reply with usage message when no wallet index is provided", async () => {
  ctx.message!.text = REMOVE_COMMAND;

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    `The wallet index should be a positive integer.\n\nUsage: /remove <index>\n\nThe index is the number left to the address shown by the /list command.`,
    USER_ID_1,
  );
});

it("should reply with error when user ID is not found in context", async () => {
  ctx.from = undefined;

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).not.toHaveBeenCalled();
});

it("should reply with error when wallet index is invalid", async () => {
  ctx.message!.text = REMOVE_COMMAND + " abc";

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "The wallet index should be a positive integer.\n\nUsage: /remove <index>\n\nThe index is the number left to the address shown by the /list command.",
    USER_ID_1,
  );
});

it("should reply with error message when wallet index is out of bounds", async () => {
  mockUserService.removeWallet.mockRejectedValue(new InvalidWalletIndexError());

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, WALLET_INDEX);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "No wallet found for the specified index.\n\nUsage: /remove <index>\n\nThe index is the number left to the address shown by the /list command.",
    USER_ID_1,
  );
});

it("should reply with generic error when removing wallet fails for unknown reason", async () => {
  mockUserService.removeWallet.mockRejectedValue(new Error("Database connection failed"));

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, WALLET_INDEX);
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    UNEXPECTED_ERROR_MESSAGE,
    USER_ID_1,
  );
});

it("should handle empty string as missing index", async () => {
  ctx.message!.text = REMOVE_COMMAND + " ";

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "The wallet index should be a positive integer.\n\nUsage: /remove <index>\n\nThe index is the number left to the address shown by the /list command.",
    USER_ID_1,
  );
});

it("should trim trailing whitespace in wallet index", async () => {
  const indexWithTrailingSpaces = WALLET_INDEX + "  ";
  ctx.message!.text = REMOVE_COMMAND + " " + indexWithTrailingSpaces;

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, WALLET_INDEX);
});

it("should handle multiple spaces between command and index", async () => {
  ctx.message!.text = REMOVE_COMMAND + "     " + WALLET_INDEX + "     ";

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).toHaveBeenCalledWith(USER_ID_1, WALLET_INDEX);
});

it("should reject index 0 as invalid", async () => {
  ctx.message!.text = REMOVE_COMMAND + " 0";

  await removeWallet(ctx);

  expect(mockUserService.removeWallet).not.toHaveBeenCalled();
  expect(mockMessageService.createForUser).toHaveBeenCalledWith(
    "The wallet index should be a positive integer.\n\nUsage: /remove <index>\n\nThe index is the number left to the address shown by the /list command.",
    USER_ID_1,
  );
});
