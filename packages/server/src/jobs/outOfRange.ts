import cron from "node-cron";
import { Logger } from "pino";
import { MessageService } from "../services/message";
import { PositionService } from "../services/position";
import { WalletService } from "../services/wallet";
import { formatAddress } from "../handlers/misc/utils";

function formatChainName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export class OutOfRangeJob {
  constructor(
    private logger: Logger,
    private message: MessageService,
    private schedule: string,
    private wallet: WalletService,
    private position: PositionService,
  ) {}

  start() {
    cron.schedule(this.schedule, this.execute.bind(this));

    this.logger.info({ schedule: this.schedule }, "Out of range job started");
  }

  async execute() {
    this.logger.info("Out of range job executing");

    const wallets = await this.wallet.listAll();

    for (const address of wallets) {
      const positions = await this.position.getPositions(address);

      if (positions.length === 0) {
        continue;
      }

      const oorPositions = positions.filter((p) => !p.inRange);

      if (oorPositions.length === 0) {
        continue;
      }

      const content: string[] = [];

      content.push(
        `⚠️ ${formatAddress(address)} has ${oorPositions.length} out-of-range position${oorPositions.length === 1 ? "" : "s"}:\n`,
      );

      for (const pos of oorPositions) {
        const isAbove = Number(pos.poolPrice) > Number(pos.priceUpper);
        const url = `https://app.uniswap.org/positions/v3/${pos.network}/${pos.nftId}`;

        let percentage: number;

        if (isAbove) {
          percentage =
            ((Number(pos.poolPrice) - Number(pos.priceUpper)) / Number(pos.priceUpper)) * 100;
        } else {
          percentage =
            ((Number(pos.priceLower) - Number(pos.poolPrice)) / Number(pos.priceLower)) * 100;
        }

        content.push(
          `[${pos.tokens.map((t) => t.symbol).join(", ")} (${formatChainName(pos.network)})](${url}) ${isAbove ? "🔺" : "🔻"}${percentage.toFixed(2)}%`,
        );
      }

      await this.message.create(content.join("\n"), address);

      this.logger.info(
        { address, oorPositions: oorPositions.length },
        "Created out of range message",
      );
    }
  }
}
