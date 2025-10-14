import cron from "node-cron";
import { Logger } from "pino";
import ms from "ms";
import { MessageService } from "../services/message";

export class CleanupJob {
  constructor(
    private logger: Logger,
    private message: MessageService,
    private schedule: string,
    private cutoff: string,
  ) {}

  start() {
    cron.schedule(this.schedule, this.execute.bind(this));

    this.logger.info({ schedule: this.schedule }, "Job Started");
  }

  async execute() {
    try {
      this.logger.info("Executing");

      const oneWeekAgo = new Date(Date.now() - ms(this.cutoff as ms.StringValue));
      const deletedMessages = await this.message.deleteBefore(oneWeekAgo);

      this.logger.info({ count: deletedMessages.count, beforeDate: oneWeekAgo }, "Executed");
    } catch (err) {
      this.logger.error({ err }, "Failed");
    }
  }
}
