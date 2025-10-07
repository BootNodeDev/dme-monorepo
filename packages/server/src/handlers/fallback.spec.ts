import { Context } from "grammy";
import { Logger } from "pino";
import { FALLBACK_MESSAGE, getFallbackHandler } from "./fallback";
import { USER_ID_1 } from "../tests/constants";

let mockLogger: jest.Mocked<Logger>;
let mockReply: jest.Mock;
let fallbackHandler: ReturnType<typeof getFallbackHandler>;
let ctx: Context;

beforeEach(() => {
  mockLogger = {
    info: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  mockReply = jest.fn();

  fallbackHandler = getFallbackHandler(mockLogger);

  ctx = {
    from: { id: USER_ID_1 },
    reply: mockReply,
    message: { text: "some random text" },
  } as unknown as Context;
});

it("should reply with usage message when fallback is triggered", async () => {
  await fallbackHandler(ctx);

  expect(mockReply).toHaveBeenCalledWith(FALLBACK_MESSAGE);
  expect(mockLogger.info).toHaveBeenCalledWith({ userId: USER_ID_1, message: "some random text" });
});
