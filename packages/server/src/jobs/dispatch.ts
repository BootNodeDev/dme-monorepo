import cron from "node-cron";
import { MessageService } from "../services/message";
import { Logger } from "pino";
import { Limiter } from "../limiter";

export class DispatchJob {
  constructor(
    private logger: Logger,
    private message: MessageService,
    private schedule: string,
    private limiter: Limiter,
  ) {}

  start() {
    cron.schedule(this.schedule, this.execute.bind(this));

    this.logger.info({ schedule: this.schedule }, "Dispatch job started");
  }

  async execute() {
    try {
      const messages = await this.message.listSendable();

      for (const msg of messages) {
        for (const recipient of msg.recipients) {
          const attempt = await this.message.newAttempt(msg.id, recipient.userId);
          const onSuccess = () => this.message.markAsDelivered(attempt);
          const onError = (error: Error) => this.message.markAsFailed(attempt, error.message);

          this.limiter.sendMessage(recipient.userId, msg.content, onSuccess, onError);
        }
      }
    } catch (error) {
      this.logger.error({ error }, "Error occurred while executing dispatch job");
    }
  }
}
