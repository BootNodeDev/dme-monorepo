import cron from "node-cron";
import { Logger } from "pino";
import { MessageService } from "../services/message";
import { Position, PositionService } from "../services/position";
import { WalletService } from "../services/wallet";
import { formatAddress } from "../handlers/misc/utils";
import { formatChainName, formatCurrency } from "./misc/utils";

export class UncollectedFeesJob {
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

      const ufPositions = getUncollectedFeesPositions(positions);

      if (ufPositions.length === 0) {
        continue;
      }

      const ufPositionsMessage = getUncollectedFeesPositionsMessage(ufPositions, address);

      await this.message.create(ufPositionsMessage, address);

      this.logger.info(
        { address, ufPositions: ufPositions.length },
        "Created uncollected fees message",
      );
    }
  }
}

export function getUncollectedFeesPositions(positions: Position[]): Position[] {
  return positions.filter((pos) => {
    const uncollected0 = parseFloat(pos.uncollectedFees0);
    const uncollected1 = parseFloat(pos.uncollectedFees1);

    const priceUsd0 = parseFloat(pos.token0Price);
    const priceUsd1 = parseFloat(pos.token1Price);

    return uncollected0 * priceUsd0 + uncollected1 * priceUsd1 > 1;
  });
}

export function getUncollectedFeesPositionsMessage(
  ufPositions: Position[],
  address: string,
): string {
  const content: string[] = [];

  content.push(
    `🤑 ${formatAddress(address)} has ${ufPositions.length} position${ufPositions.length === 1 ? "" : "s"} with uncollected fees:\n`,
  );

  for (const pos of ufPositions) {
    const uncollected0 = parseFloat(pos.uncollectedFees0);
    const uncollected1 = parseFloat(pos.uncollectedFees1);

    const priceUsd0 = parseFloat(pos.token0Price);
    const priceUsd1 = parseFloat(pos.token1Price);

    const sum = uncollected0 * priceUsd0 + uncollected1 * priceUsd1;

    const url = `https://app.uniswap.org/positions/v3/${pos.network}/${pos.nftId}`;

    content.push(
      `[${pos.token0Symbol}, ${pos.token1Symbol} (${formatChainName(pos.network)})](${url}) ${formatCurrency(sum)}`,
    );
  }

  return content.join("\n");
}
