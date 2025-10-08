import { UserMessageAttempt } from "@prisma/client";
import cron from "node-cron";
import { Logger } from "pino";
import { MessageService } from "../services/message";
import {
  CRON_SCHEDULE,
  MESSAGE_CONTENT,
  MESSAGE_ID,
  USER_ID_1,
  USER_ID_2,
} from "../tests/constants";
import { DispatchJob } from "./dispatch";
import { Limiter } from "../limiter";

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
let mockLogger: jest.Mocked<Logger>;
let mockMessageService: jest.Mocked<MessageService>;
let mockLimiter: jest.Mocked<Limiter>;

beforeEach(() => {
  mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  mockMessageService = {
    listSendable: jest.fn(),
    newAttempt: jest.fn(),
    markAsDelivered: jest.fn(),
    markAsFailed: jest.fn(),
  } as unknown as jest.Mocked<MessageService>;

  mockLimiter = {
    sendMessage: jest.fn(),
  } as unknown as jest.Mocked<Limiter>;

  dispatch = new DispatchJob(mockLogger, mockMessageService, CRON_SCHEDULE, mockLimiter);
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

  it("should call send and message service methods for each unsent message and call mark as delivered on success", async () => {
    mockLimiter.sendMessage.mockImplementation((_, __, onSuccess) => {
      onSuccess();
    });

    await dispatch.execute();

    expect(mockMessageService.newAttempt).toHaveBeenCalledWith(MESSAGE_ID, USER_ID_1);
    expect(mockMessageService.newAttempt).toHaveBeenCalledWith(MESSAGE_ID, USER_ID_2);
    expect(mockLimiter.sendMessage).toHaveBeenCalledWith(
      USER_ID_1,
      MESSAGE_CONTENT,
      expect.any(Function),
      expect.any(Function),
    );
    expect(mockLimiter.sendMessage).toHaveBeenCalledWith(
      USER_ID_2,
      MESSAGE_CONTENT,
      expect.any(Function),
      expect.any(Function),
    );
    expect(mockMessageService.markAsDelivered).toHaveBeenCalledWith(attempt1);
    expect(mockMessageService.markAsDelivered).toHaveBeenCalledWith(attempt2);
  });

  it("should call mark as failed on error", async () => {
    mockLimiter.sendMessage.mockImplementation((_, __, ___, onError) => {
      onError(new Error("Some Error"));
    });

    await dispatch.execute();

    expect(mockMessageService.markAsFailed).toHaveBeenCalledWith(attempt1, "Some Error");
    expect(mockMessageService.markAsFailed).toHaveBeenCalledWith(attempt2, "Some Error");
  });

  it("should log error when listSendable throws an error", async () => {
    const error = new Error("Database connection failed");
    mockMessageService.listSendable.mockRejectedValue(error);

    await dispatch.execute();

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error },
      "Error occurred while executing dispatch job",
    );
  });
});
