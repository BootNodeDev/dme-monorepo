import cron from "node-cron";
import { Logger } from "pino";
import { Bot, Context, SessionFlavor } from "grammy";
import { MessageService } from "../services/message";

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

    this.logger.info("Executing");

    try {
      const userMessages = await this.message.listSendable(this.messagesPerDispatch);

      await Promise.allSettled(
        userMessages.map(async ({ userId, message }) => {
          await this.message.updateForSend(userId, message.id);

          try {
            await this.bot.api.sendMessage(userId, message.content, {
              parse_mode: "MarkdownV2",
              link_preview_options: {
                is_disabled: true,
              },
            });

            await this.message.updateForSuccess(userId, message.id);
          } catch (error) {
            await this.message.updateForFailure(userId, message.id, (error as Error).message);
          }
        }),
      );
    } catch (error) {
      this.logger.error({ error }, "Failed");
    } finally {
      this.isExecuting = false;
    }
  }
}
