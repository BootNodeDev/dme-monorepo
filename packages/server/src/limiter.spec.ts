import PQueue from "p-queue";
import { Limiter, LOW_PRIORITY, TOP_PRIORITY } from "./limiter";
import { Bot, Context, SessionFlavor } from "grammy";
import { MESSAGE_CONTENT, USER_ID_1 } from "./tests/constants";
import { Logger } from "pino";

jest.mock("p-queue", () =>
  jest.fn().mockImplementation(() => ({
    add: jest.fn().mockImplementation((task) => task()),
  })),
);

const interval = 1000;
const intervalCap = 5;

let mockLogger: jest.Mocked<Logger>;
let mockBot: jest.Mocked<Bot<Context & SessionFlavor<unknown>>>;

class LimiterHarness extends Limiter {
  add<T>(priority: number, fn: () => Promise<T>): void {
    super.add(priority, fn);
  }
}

beforeEach(() => {
  mockLogger = {
    info: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  mockBot = {
    api: {
      sendMessage: jest.fn().mockResolvedValue(null),
    },
  } as unknown as jest.Mocked<Bot<Context & SessionFlavor<unknown>>>;
});

describe("Limiter", () => {
  it("should create a pqueue with the given options", () => {
    new LimiterHarness(mockLogger, interval, intervalCap, mockBot);

    expect(PQueue).toHaveBeenCalledWith({
      intervalCap,
      interval,
      carryoverIntervalCount: false,
    });
  });

  describe("reply", () => {
    it("should add a reply task to the limiter", () => {
      const limiter = new LimiterHarness(mockLogger, interval, intervalCap, mockBot);

      const ctx = {
        reply: jest.fn(),
      } as unknown as Context;

      const addSpy = jest.spyOn(limiter, "add");

      limiter.reply(ctx, MESSAGE_CONTENT);

      expect(addSpy).toHaveBeenCalledWith(TOP_PRIORITY, expect.any(Function));
    });
  });

  describe("sendMessage", () => {
    it("should add a sendMessage task to the limiter", () => {
      const limiter = new LimiterHarness(mockLogger, interval, intervalCap, mockBot);

      const addSpy = jest.spyOn(limiter, "add");

      limiter.sendMessage(USER_ID_1, MESSAGE_CONTENT, jest.fn(), jest.fn());

      expect(addSpy).toHaveBeenCalledWith(LOW_PRIORITY, expect.any(Function));
    });
  });
});
