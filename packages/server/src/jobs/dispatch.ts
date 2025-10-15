import cron from "node-cron";
import { Logger } from "pino";
import { Bot, Context, SessionFlavor } from "grammy";
import { MessageService, UserMessage } from "../services/message";

export class DispatchJob {
  private isExecuting = false;

  constructor(
    private logger: Logger,
    private message: MessageService,
    private schedule: string,
    private bot: Bot<Context & SessionFlavor<unknown>>,
    private messagesPerDispatch: number,
  ) {}

  start() {
    cron.schedule(this.schedule, this.execute.bind(this));

    this.logger.info({ schedule: this.schedule }, "Job Started");
  }

  async execute() {
    if (this.isExecuting) {
      return;
    }

    // Prevent overlapping executions
    // The current design is not intended to handle various instances running in parallel
    this.isExecuting = true;
    this.logger.info("Executing");

    try {
      const userMessages = await this.message.listSendable(this.messagesPerDispatch);

      // Updates all messages to "sending" status
      // Has to be done sequentially to avoid SQlite DB busy errors
      // Consider using PostgresQL and refactor for parallel execution if performance becomes an issue
      const updatedForSend = await this.updateForSend(userMessages);

      // Sends all messages in parallel
      // "messagesPerDispatch" should be a low enough number to avoid hitting Telegram rate limits
      // This is 30 per second by default, which is the limit for non premium bots
      const settled = await this.sendMessages(updatedForSend);

      // Updates sent messages to "sent" or "failed" status according to the settled results
      await this.updateForResult(updatedForSend, settled);
    } catch (err) {
      this.logger.error({ err }, "Failed");
    } finally {
      this.isExecuting = false;
    }
  }

  private async updateForSend(userMessages: UserMessage[]) {
    const updated: UserMessage[] = [];

    for (const userMessage of userMessages) {
      const { userId, messageId } = userMessage;

      try {
        await this.message.updateForSend(userId, messageId);
        updated.push(userMessage);
      } catch (err) {
        this.logger.error({ err, userId, messageId }, "Failed to update message for send");
      }
    }

    return updated;
  }

  private async sendMessages(userMessages: UserMessage[]) {
    return await Promise.allSettled(
      userMessages.map(({ userId, message }) =>
        this.bot.api.sendMessage(userId, message.content, {
          parse_mode: "MarkdownV2",
          link_preview_options: {
            is_disabled: true,
          },
        }),
      ),
    );
  }

  private async updateForResult(
    userMessages: UserMessage[],
    settled: Awaited<ReturnType<DispatchJob["sendMessages"]>>,
  ) {
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const { userId, message } = userMessages[i];
      const messageId = message.id;

      try {
        if (result.status === "fulfilled") {
          await this.message.updateForSuccess(userId, messageId);
        } else {
          await this.message.updateForFailure(userId, messageId, result.reason?.message);
        }
      } catch (err) {
        this.logger.error({ err, userId, messageId }, "Failed to update message after send");
      }
    }
  }
}
