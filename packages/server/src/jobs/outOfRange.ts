import cron from "node-cron";
import { Logger } from "pino";
import { MessageService } from "../services/message";
import { Position, PositionService } from "../services/position";
import { WalletService } from "../services/wallet";
import { formatAddress } from "../handlers/misc/utils";
import { formatChainName } from "./misc/utils";

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

    this.logger.info({ schedule: this.schedule }, "Job started");
  }

  async execute() {
    this.logger.info("Executing");

    const wallets = await this.wallet.listAll();

    for (const address of wallets) {
      const positions = await this.position.getPositions(address);

      const oorPositions = getOutOfRangePositions(positions);

      if (oorPositions.length === 0) {
        continue;
      }

      const oorPositionsMessage = getOutOfRangePositionsMessage(oorPositions, address);

      await this.message.create(oorPositionsMessage, address);

      this.logger.info(
        { address, oorPositions: oorPositions.length },
        "Created out of range message",
      );
    }
  }
}

export function getOutOfRangePositions(positions: Position[]): Position[] {
  return positions.filter((pos) => !pos.inRange);
}

export function getOutOfRangePositionsMessage(oorPositions: Position[], address: string): string {
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
      `[${pos.token0Symbol}, ${pos.token1Symbol} (${formatChainName(pos.network)})](${url}) ${isAbove ? "🔺" : "🔻"}${percentage.toFixed(2)}%`,
    );
  }

  return content.join("\n");
}
