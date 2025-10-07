import cron from "node-cron";
import { MessageService } from "../services/message";
import { PositionService } from "../services/position";
import { WalletService } from "../services/wallet";

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatChainName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export class OutOfRangeJob {
  constructor(
    private message: MessageService,
    private schedule: string,
    private wallet: WalletService,
    private position: PositionService,
  ) {}

  start() {
    cron.schedule(this.schedule, this.execute.bind(this));
  }

  async execute() {
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
    }
  }
}
