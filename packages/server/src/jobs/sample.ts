import cron from "node-cron";
import { Logger } from "pino";
import { MessageService } from "../services/message";
import { WalletService } from "../services/wallet";
import { formatAddress } from "../handlers/misc/utils";

export class SampleJob {
  constructor(
    private logger: Logger,
    private message: MessageService,
    private schedule: string,
    private wallet: WalletService,
  ) {}

  start() {
    cron.schedule(this.schedule, this.execute.bind(this));

    this.logger.info({ schedule: this.schedule }, "Job Started");
  }

  async execute() {
    this.logger.info("Executing");

    const wallets = await this.wallet.listAll();

    for (const address of wallets) {
      await this.message.create(
        `Hello, ${formatAddress(address)}! This bot is up and running 🚀`,
        address,
      );
    }
  }
}
