import { formatAddress, baseHandler, UNEXPECTED_ERROR_MESSAGE } from "./utils";
import { ETHEREUM_ADDRESS_1, USER_ID_1 } from "../../tests/constants";
import { getMockLogger, getMockMessageService } from "../../tests/mocks";
import { Logger } from "pino";
import { MessageService } from "../../services/message";
import { CommandContext, Context } from "grammy";

describe("formatAddress", () => {
  it("should return the shortened version of the address", () => {
    expect(formatAddress(ETHEREUM_ADDRESS_1)).toBe("0xBEE9...BBAB");
  });
});

describe("baseHandler", () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockMessageService: jest.Mocked<MessageService>;
  let ctx: CommandContext<Context>;

  beforeEach(() => {
    mockLogger = getMockLogger();
    mockMessageService = getMockMessageService();
    ctx = {
      from: { id: USER_ID_1 },
      message: { text: "/test command" },
    } as unknown as CommandContext<Context>;
  });

  it("should execute the handler function successfully", async () => {
    const mockHandler = jest.fn().mockResolvedValue(undefined);
    const handler = baseHandler(mockLogger, mockMessageService, mockHandler);

    await handler(ctx);

    expect(mockHandler).toHaveBeenCalledWith(USER_ID_1, ctx);
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockMessageService.createForUser).not.toHaveBeenCalled();
  });

  it("should throw error when user ID is not found in context", async () => {
    const mockHandler = jest.fn();
    const handler = baseHandler(mockLogger, mockMessageService, mockHandler);

    ctx.from = undefined;

    await handler(ctx);

    expect(mockHandler).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        err: expect.any(Error),
        userId: undefined,
        message: "/test command",
      },
      "Handler error",
    );
    expect(mockMessageService.createForUser).not.toHaveBeenCalled();
  });

  it("should handle errors from handler function and send error message", async () => {
    const error = new Error("Handler failed");
    const mockHandler = jest.fn().mockRejectedValue(error);
    const handler = baseHandler(mockLogger, mockMessageService, mockHandler);

    await handler(ctx);

    expect(mockHandler).toHaveBeenCalledWith(USER_ID_1, ctx);
    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        err: error,
        userId: USER_ID_1,
        message: "/test command",
      },
      "Handler error",
    );
    expect(mockMessageService.createForUser).toHaveBeenCalledWith(
      UNEXPECTED_ERROR_MESSAGE,
      USER_ID_1,
    );
  });
});
