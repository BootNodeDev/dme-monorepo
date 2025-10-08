import PQueue from "p-queue";
import { BASE_OPTIONS, getLimiter, getReplyFn, getSendMessageFn } from "./limiter";
import { Bot, Context } from "grammy";
import { MESSAGE_CONTENT, USER_ID_1 } from "./tests/constants";

jest.mock("p-queue", () =>
  jest.fn().mockImplementation(() => ({
    add: jest.fn().mockImplementation((task) => task()),
  })),
);

const interval = 1000;
const intervalCap = 5;

describe("getLimiter", () => {
  it("should create a pqueue with the given options", () => {
    getLimiter(interval, intervalCap);

    expect(PQueue).toHaveBeenCalledWith({
      intervalCap,
      interval,
      carryoverIntervalCount: false,
    });
  });
});

describe("getReplyFn", () => {
  it("should return a function that adds a reply task to the limiter", () => {
    const limiter = getLimiter(interval, intervalCap);

    const ctx = {
      reply: jest.fn(),
    } as unknown as Context;

    getReplyFn(limiter)(ctx, MESSAGE_CONTENT);

    expect(limiter.add).toHaveBeenCalledWith(expect.any(Function));
    expect(ctx.reply).toHaveBeenCalledWith(MESSAGE_CONTENT, BASE_OPTIONS);
  });
});

describe("getSendMessageFn", () => {
  it("should return a function that adds a sendMessage task to the limiter", () => {
    const limiter = getLimiter(interval, intervalCap);

    const mockBot = {
      api: {
        sendMessage: jest.fn().mockResolvedValue(null),
      },
    } as unknown as jest.Mocked<Bot>;

    getSendMessageFn(limiter, mockBot)(USER_ID_1, MESSAGE_CONTENT, jest.fn(), jest.fn());

    expect(limiter.add).toHaveBeenCalledWith(expect.any(Function));
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(USER_ID_1, MESSAGE_CONTENT, BASE_OPTIONS);
  });
});
