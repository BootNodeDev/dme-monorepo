import cron from "node-cron";
import { Logger } from "pino";
import { MessageService } from "../services/message";
import { Position, PositionService } from "../services/position";
import { WalletService } from "../services/wallet";
import { formatAddress } from "../handlers/misc/utils";

function formatChainName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatCurrency(num: number) {
  const [integer, decimal = ""] = num.toString().split(".");

  if (!decimal.length) {
    return integer;
  }

  let decimalSignificantFoundAt = 0;

  for (let i = 0; i < decimal.length; i++) {
    if (decimal[i] !== "0") {
      decimalSignificantFoundAt = i;
      break;
    }
  }

  return (
    "$" +
    Intl.NumberFormat("en-US", {
      compactDisplay: "short",
      notation: "compact",
      maximumFractionDigits: decimalSignificantFoundAt + 2,
    }).format(num)
  );
}

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
    this.logger.info("Out of range job executing");

    const wallets = await this.wallet.listAll();

    for (const address of wallets) {
      const oorPositions = await getUncollectedFeesPositions(address, this.position);

      if (oorPositions.length === 0) {
        continue;
      }

      const oorPositionsMessage = getUncollectedFeesPositionsMessage(oorPositions, address);

      await this.message.create(oorPositionsMessage, address);

      this.logger.info(
        { address, oorPositions: oorPositions.length },
        "Created out of range message",
      );
    }
  }
}

export async function getUncollectedFeesPositions(
  address: string,
  position: PositionService,
): Promise<Position[]> {
  return (await position.getPositions(address)).filter((pos) => {
    const uncollected0 = parseFloat(pos.uncollectedFees0);
    const uncollected1 = parseFloat(pos.uncollectedFees1);

    const priceUsd0 = parseFloat(pos.token0Price);
    const priceUsd1 = parseFloat(pos.token1Price);

    console.log({ uncollected0, uncollected1, priceUsd0, priceUsd1 });

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
