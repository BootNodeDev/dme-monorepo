import cron from "node-cron";
import { Logger } from "pino";
import { Bot, Context, SessionFlavor } from "grammy";
import {
  MessageService,
  UserMessage,
  UserMessageId,
  UserMessageIdWithError,
} from "../services/message";

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

    this.isExecuting = true;
    this.logger.info("Executing");

    try {
      const userMessages = await this.message.listSendable(this.messagesPerDispatch);

      if (userMessages.length === 0) {
        return;
      }

      await this.message.updateForSend(userMessages);
      const settled = await this.sendMessages(userMessages);
      await this.updateForResult(userMessages, settled);
    } catch (err) {
      this.logger.error({ err }, "Failed");
    } finally {
      this.isExecuting = false;
    }
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
    const success: UserMessageId[] = [];
    const failure: UserMessageIdWithError[] = [];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const { userId, message } = userMessages[i];
      const messageId = message.id;

      if (result.status === "fulfilled") {
        success.push({ userId, messageId });
      } else {
        this.logger.error({ err: result.reason, userId, messageId }, "Message send failed");
        failure.push({ userId, messageId, error: result.reason?.message });
      }
    }

    await this.message.updateForSuccess(success);
    await this.message.updateForFailure(failure);
  }
}
