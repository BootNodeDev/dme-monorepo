import {
  CRON_SCHEDULE,
  MESSAGE_CONTENT,
  MESSAGE_ID,
  MESSAGES_PER_DISPATCH,
  USER_ID_1,
} from "../tests/constants";
import { getMockBot, getMockLogger, getMockMessageService } from "../tests/mocks";
import { DispatchJob } from "./dispatch";
import { MessageService, UserMessage } from "../services/message";
import cron from "node-cron";

jest.mock("node-cron");

describe("start", () => {
  it("should start the job with the provided cron schedule", () => {
    const message = getMockMessageService();
    const logger = getMockLogger();
    const bot = getMockBot();
    const schedule = "*/1 * * * * *";
    const job = new DispatchJob(logger, message, schedule, bot, MESSAGES_PER_DISPATCH);
    const mockCron = jest.spyOn(cron, "schedule");

    job.start();

    expect(mockCron).toHaveBeenCalledWith(schedule, expect.any(Function));
  });
});

describe("execute", () => {
  it("should send messages to users", async () => {
    const message = getMockMessageService();
    const logger = getMockLogger();
    const bot = getMockBot();
    const job = new DispatchJob(logger, message, CRON_SCHEDULE, bot, MESSAGES_PER_DISPATCH);

    message.listSendable.mockResolvedValue([
      {
        userId: USER_ID_1,
        messageId: MESSAGE_ID,
        message: {
          id: MESSAGE_ID,
          content: MESSAGE_CONTENT,
        },
      },
    ] as unknown as Awaited<ReturnType<MessageService["listSendable"]>>);

    await job.execute();

    expect(message.listSendable).toHaveBeenCalledWith(MESSAGES_PER_DISPATCH);
    expect(message.updateForSend).toHaveBeenCalledWith(USER_ID_1, MESSAGE_ID);
    expect(bot.api.sendMessage).toHaveBeenCalledWith(USER_ID_1, MESSAGE_CONTENT, {
      parse_mode: "MarkdownV2",
      link_preview_options: {
        is_disabled: true,
      },
    });
    expect(message.updateForSuccess).toHaveBeenCalledWith(USER_ID_1, MESSAGE_ID);
  });

  it("should handle send message failure", async () => {
    const message = getMockMessageService();
    const logger = getMockLogger();
    const bot = getMockBot();
    const job = new DispatchJob(logger, message, CRON_SCHEDULE, bot, MESSAGES_PER_DISPATCH);

    message.listSendable.mockResolvedValue([
      {
        userId: USER_ID_1,
        messageId: MESSAGE_ID,
        message: {
          id: MESSAGE_ID,
          content: MESSAGE_CONTENT,
        },
      },
    ] as unknown as Awaited<ReturnType<MessageService["listSendable"]>>);

    jest.mocked(bot.api.sendMessage).mockRejectedValueOnce(new Error("Telegram error"));

    await job.execute();

    expect(message.updateForSend).toHaveBeenCalledWith(USER_ID_1, MESSAGE_ID);
    expect(bot.api.sendMessage).toHaveBeenCalledWith(USER_ID_1, MESSAGE_CONTENT, {
      parse_mode: "MarkdownV2",
      link_preview_options: {
        is_disabled: true,
      },
    });
    expect(message.updateForFailure).toHaveBeenCalledWith(USER_ID_1, MESSAGE_ID, "Telegram error");
  });

  it("should handle the case in which listSendable fails", async () => {
    const message = getMockMessageService();
    const logger = getMockLogger();
    const bot = getMockBot();
    const job = new DispatchJob(logger, message, CRON_SCHEDULE, bot, MESSAGES_PER_DISPATCH);
    const error = new Error("Database error");

    message.listSendable.mockRejectedValueOnce(error);

    await job.execute();

    expect(logger.error).toHaveBeenCalledWith({ err: error }, "Failed");
  });

  it("should handle updateForSend failure", async () => {
    const message = getMockMessageService();
    const logger = getMockLogger();
    const bot = getMockBot();
    const job = new DispatchJob(logger, message, CRON_SCHEDULE, bot, MESSAGES_PER_DISPATCH);

    message.listSendable.mockResolvedValue([
      {
        userId: USER_ID_1,
        messageId: MESSAGE_ID,
        message: {
          id: MESSAGE_ID,
          content: MESSAGE_CONTENT,
        },
      },
    ] as unknown as UserMessage[]);

    const error = new Error("Update error");
    message.updateForSend.mockRejectedValueOnce(error);

    await job.execute();

    expect(message.updateForSend).toHaveBeenCalledWith(USER_ID_1, MESSAGE_ID);
    expect(logger.error).toHaveBeenCalledWith(
      { err: error, userId: USER_ID_1, messageId: MESSAGE_ID },
      "Failed to update message for send",
    );
  });

  it("should handle updateForResult failure", async () => {
    const message = getMockMessageService();
    const logger = getMockLogger();
    const bot = getMockBot();
    const job = new DispatchJob(logger, message, CRON_SCHEDULE, bot, MESSAGES_PER_DISPATCH);

    message.listSendable.mockResolvedValue([
      {
        userId: USER_ID_1,
        messageId: MESSAGE_ID,
        message: {
          id: MESSAGE_ID,
          content: MESSAGE_CONTENT,
        },
      },
    ] as unknown as UserMessage[]);

    const error = new Error("Update success error");
    message.updateForSuccess.mockRejectedValueOnce(error);

    await job.execute();

    expect(message.updateForSend).toHaveBeenCalledWith(USER_ID_1, MESSAGE_ID);
    expect(bot.api.sendMessage).toHaveBeenCalledWith(USER_ID_1, MESSAGE_CONTENT, {
      parse_mode: "MarkdownV2",
      link_preview_options: {
        is_disabled: true,
      },
    });
    expect(message.updateForSuccess).toHaveBeenCalledWith(USER_ID_1, MESSAGE_ID);
    expect(logger.error).toHaveBeenCalledWith(
      { err: error, userId: USER_ID_1, messageId: MESSAGE_ID },
      "Failed to update message after send",
    );
  });

  it("should not run if already executing", async () => {
    const message = getMockMessageService();
    const logger = getMockLogger();
    const bot = getMockBot();
    const job = new DispatchJob(logger, message, CRON_SCHEDULE, bot, MESSAGES_PER_DISPATCH);

    (job as unknown as { isExecuting: boolean }).isExecuting = true;

    await job.execute();

    expect(message.listSendable).not.toHaveBeenCalled();
  });
});
