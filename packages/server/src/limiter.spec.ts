import PQueue from "p-queue";
import { getLimiter, getReplyFn } from "./limiter";
import { Context } from "grammy";
import { MESSAGE_CONTENT } from "./tests/constants";

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
    expect(ctx.reply).toHaveBeenCalledWith(MESSAGE_CONTENT, {
      parse_mode: "MarkdownV2",
      link_preview_options: { is_disabled: true },
    });
  });
});
