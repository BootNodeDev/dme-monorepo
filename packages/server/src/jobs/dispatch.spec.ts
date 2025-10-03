import { PrismaClient, UserMessageAttempt } from "@prisma/client";
import cron from "node-cron";
import { MessageService } from "../services/message";
import {
  CRON_SCHEDULE,
  MESSAGE_CONTENT,
  MESSAGE_ID,
  USER_ID_1,
  USER_ID_2,
} from "../tests/constants";
import { DispatchJob } from "./dispatch";

jest.mock("../services/message");
jest.mock("node-cron");
jest.mock("p-queue", () =>
  jest.fn().mockImplementation(() => ({
    add: jest.fn((task) => task()),
    onIdle: jest.fn().mockResolvedValue(undefined),
    size: 0,
    pending: 0,
  })),
);

const mockCron = cron as jest.Mocked<typeof cron>;

let dispatch: DispatchJob;
let mockMessageService: jest.Mocked<MessageService>;
let mockSend: jest.Mock;

beforeEach(() => {
  mockMessageService = new MessageService(
    null as unknown as PrismaClient,
  ) as jest.Mocked<MessageService>;

  mockMessageService.listSendable = jest.fn();
  mockMessageService.newAttempt = jest.fn();
  mockMessageService.markAsDelivered = jest.fn();
  mockMessageService.markAsFailed = jest.fn();

  mockSend = jest.fn();

  dispatch = new DispatchJob(mockMessageService, CRON_SCHEDULE, mockSend);
});

describe("start", () => {
  it("should schedule the job with the correct cron expression", async () => {
    dispatch.start();

    expect(mockCron.schedule).toHaveBeenCalledWith(CRON_SCHEDULE, expect.any(Function));
  });
});

describe("execute", () => {
  let attempt1: UserMessageAttempt;
  let attempt2: UserMessageAttempt;

  beforeEach(() => {
    const now = new Date();

    mockMessageService.listSendable.mockResolvedValue([
      {
        content: MESSAGE_CONTENT,
        id: MESSAGE_ID,
        createdAt: now,
        recipients: [
          {
            userId: USER_ID_1,
            messageId: MESSAGE_ID,
            createdAt: now,
          },
          {
            userId: USER_ID_2,
            messageId: MESSAGE_ID,
            createdAt: now,
          },
        ],
      },
    ]);

    attempt1 = {
      attempt: 1,
      userId: USER_ID_1,
      messageId: MESSAGE_ID,
      sentAt: now,
      deliveredAt: null,
      error: null,
      nextAttemptAt: now,
    };

    attempt2 = {
      attempt: 1,
      userId: USER_ID_2,
      messageId: MESSAGE_ID,
      sentAt: now,
      deliveredAt: null,
      error: null,
      nextAttemptAt: now,
    };

    mockMessageService.newAttempt.mockResolvedValueOnce(attempt1);
    mockMessageService.newAttempt.mockResolvedValueOnce(attempt2);
  });

  it("should call send and message service methods for each unsent message", async () => {
    await dispatch.execute();

    expect(mockMessageService.newAttempt).toHaveBeenCalledWith(MESSAGE_ID, USER_ID_1);
    expect(mockMessageService.newAttempt).toHaveBeenCalledWith(MESSAGE_ID, USER_ID_2);
    expect(mockSend).toHaveBeenCalledWith(USER_ID_1, MESSAGE_CONTENT);
    expect(mockSend).toHaveBeenCalledWith(USER_ID_2, MESSAGE_CONTENT);
    expect(mockMessageService.markAsDelivered).toHaveBeenCalledWith(attempt1);
    expect(mockMessageService.markAsDelivered).toHaveBeenCalledWith(attempt2);
  });

  it("should call markAsFailed if send throws an error", async () => {
    const errorMessage = "Send failed";
    mockSend.mockRejectedValue(new Error(errorMessage));

    await dispatch.execute();

    expect(mockMessageService.newAttempt).toHaveBeenCalledWith(MESSAGE_ID, USER_ID_1);
    expect(mockMessageService.newAttempt).toHaveBeenCalledWith(MESSAGE_ID, USER_ID_2);
    expect(mockSend).toHaveBeenCalledWith(USER_ID_1, MESSAGE_CONTENT);
    expect(mockSend).toHaveBeenCalledWith(USER_ID_2, MESSAGE_CONTENT);
    expect(mockMessageService.markAsFailed).toHaveBeenCalledWith(attempt1, errorMessage);
    expect(mockMessageService.markAsFailed).toHaveBeenCalledWith(attempt2, errorMessage);
  });

  it("should not execute if already executing", async () => {
    mockMessageService.listSendable.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 10))
    );

    const promise1 = dispatch.execute();
    const promise2 = dispatch.execute();

    await promise1;
    await promise2;

    expect(mockMessageService.listSendable).toHaveBeenCalledTimes(1);
  });

  it("should reuse existing user queues", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queue1 = (dispatch as any).getUserQueue(USER_ID_1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queue2 = (dispatch as any).getUserQueue(USER_ID_1);

    expect(queue1).toBe(queue2);
  });

  it("should not cleanup user queues with pending tasks", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queue = (dispatch as any).getUserQueue(USER_ID_1);
    queue.pending = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dispatch as any).cleanupUserQueues();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((dispatch as any).userQueues.has(USER_ID_1)).toBe(true);
  });
});
